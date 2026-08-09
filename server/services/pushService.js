const PushSubscription = require("../models/PushSubscription");
const User = require("../models/User");
const webpush = require("web-push");

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:jurgen126q@gmail.com",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err) {
    console.error("Errore configurazione VAPID in pushService:", err.message);
  }
}

/**
 * Mappa tipo notifica → campo preferenza utente
 */
const NOTIFICATION_TYPE_MAP = {
  "new_comment": "comments",
  "comment_mention": "mentions",
  "review_mention": "mentions",
  "chat_mention": "mentions",
  "thread_comment": "thread_replies",
  "new_reaction": "reactions",
  "new_follower": "followers",
};

/**
 * Invia una notifica Push ricca di contenuti a un utente.
 * 
 * MIGLIORAMENTI:
 * - Invio in parallelo con Promise.allSettled (non sequenziale)
 * - Supporto tag per collapsing notifiche dello stesso tipo
 * - Supporto renotify per segnalare anche se sostituisce una notifica
 * - Check preferenze utente prima di inviare
 * - Timestamp automatico
 * - Vibration pattern per mobile
 * 
 * NOTA: Questa funzione NON deve essere await-ata nei controller.
 * Deve essere chiamata fire-and-forget per non bloccare la response HTTP.
 * 
 * @param {String|ObjectId} userId - ID dell'utente destinatario
 * @param {Object} notificationData - Dati per la notifica
 * @param {String} notificationData.title - Titolo della notifica
 * @param {String} notificationData.body - Anteprima testo
 * @param {String} [notificationData.url] - Link al click
 * @param {String} [notificationData.icon] - Avatar dell'utente notificatore
 * @param {String} [notificationData.image] - Locandina del film
 * @param {String} [notificationData.tag] - Tag per collapsing (es: "comment-{reviewId}")
 * @param {String} [notificationData.notificationType] - Tipo per check preferenze (es: "new_comment")
 * @param {Array}  [notificationData.actions] - Quick Actions
 */
async function sendPushNotification(userId, { 
  title, body, url = "/", icon, image, tag, notificationType, actions = [] 
}) {
  try {
    // --- Check preferenze utente ---
    const user = await User.findById(userId).select("notification_preferences").lean();
    if (user) {
      const DEFAULT_PREFERENCES = {
        push_enabled: true,
        comments: true,
        reactions: true,
        followers: true,
        mentions: true,
        thread_replies: true,
      };
      const prefs = { ...DEFAULT_PREFERENCES, ...(user.notification_preferences || {}) };

      // Se push_enabled è disattivato, non inviare alcuna push
      if (prefs.push_enabled === false) return;

      // Se il tipo specifico è disattivato, non inviare
      if (notificationType) {
        const prefField = NOTIFICATION_TYPE_MAP[notificationType];
        if (prefField && prefs[prefField] === false) return;
      }
    }

    const subs = await PushSubscription.find({ user: userId });
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: title || "Skibidi Film",
      body: body || "Hai una nuova notifica!",
      url: url || "/",
      icon: icon || "/pwa-192x192.png",
      image: image || undefined,
      tag: tag || undefined,
      renotify: !!tag, // Se c'è un tag, segnala comunque (vibra/suona anche se sostituisce)
      timestamp: Date.now(),
      vibrate: [100, 50, 100], // Pattern vibrazione per mobile
      actions: actions
    });

    // --- Invio in parallelo a tutti i device dell'utente ---
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload,
          { TTL: 86400 }
        ).catch(async (err) => {
          // Se 410 (scaduta), 404 (non trovata), 403 (chiavi VAPID cambiate) → rimuovi
          if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 403) {
            await sub.deleteOne().catch(() => {});
          } else {
            console.error(`⚠️ Errore invio Push (${err.statusCode}):`, err.message);
          }
          throw err; // Re-throw per registrare come "rejected" in allSettled
        })
      )
    );

    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed > 0) {
      console.log(`📲 Push inviata a ${userId}: ${succeeded} ok, ${failed} fallite`);
    }
  } catch (e) {
    console.error("❌ Errore generale Push Notification:", e);
  }
}

module.exports = {
  sendPushNotification
};
