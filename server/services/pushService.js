const PushSubscription = require("../models/PushSubscription");
const webpush = require("web-push");

/**
 * Invia una notifica Push ricca di contenuti a un utente
 * @param {String|ObjectId} userId - ID dell'utente destinatario
 * @param {Object} notificationData - Dati per la notifica
 * @param {String} notificationData.title - Titolo della notifica (es: "banana su Inception 💬")
 * @param {String} notificationData.body - Anteprima testo commento / descrizione
 * @param {String} [notificationData.url] - Link al click
 * @param {String} [notificationData.icon] - Avatar dell'utente notificatore o icona
 * @param {String} [notificationData.image] - Locandina del film o banner grande
 * @param {Array} [notificationData.actions] - Quick Actions
 */
async function sendPushNotification(userId, { title, body, url = "/", icon, image, actions = [] }) {
  try {
    const subs = await PushSubscription.find({ user: userId });
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({
      title: title || "Skibidi Film",
      body: body || "Hai una nuova notifica!",
      url: url || "/",
      icon: icon || "/pwa-192x192.png",
      image: image || undefined,
      actions: actions
    });

    for (let sub of subs) {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload
      ).catch(async (err) => {
        // Se 410 (scaduta), 404 (non trovata), 403 (chiavi VAPID cambiate), rimuoviamo la sottoscrizione non valida
        if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 403) {
          await sub.deleteOne().catch(() => {});
        } else {
          console.error(`⚠️ Errore invio Push (${err.statusCode}):`, err.message);
        }
      });
    }
  } catch (e) {
    console.error("❌ Errore generale Push Notification:", e);
  }
}

module.exports = {
  sendPushNotification
};
