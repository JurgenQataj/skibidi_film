const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const { protect } = require("../middleware/authMiddleware");

// Configura web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:jurgen126q@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.error("VAPID Keys not provided. Push Notifications won't work!");
}

// Salva la subscription
router.post("/subscribe", protect, async (req, res) => {
  try {
    const subscription = req.body;
    
    // Controlla se l'utente ha già una subscription con questo endpoint
    let existingSub = await PushSubscription.findOne({
      user: req.user.id,
      endpoint: subscription.endpoint
    });

    if (existingSub) {
      // Aggiorna le chiavi se sono cambiate
      existingSub.keys = subscription.keys;
      await existingSub.save();
      return res.status(200).json({ message: "Sottoscrizione aggiornata." });
    }

    const newSub = new PushSubscription({
      user: req.user.id,
      endpoint: subscription.endpoint,
      keys: subscription.keys
    });

    await newSub.save();
    res.status(201).json({ message: "Sottoscrizione salvata con successo." });
    
  } catch (error) {
    console.error("Errore salvataggio sottoscrizione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
});

// Rimuovi la subscription (unsubscribe)
router.delete("/unsubscribe", protect, async (req, res) => {
  try {
    const { endpoint } = req.body;

    if (endpoint) {
      // Rimuovi una subscription specifica per endpoint
      await PushSubscription.deleteOne({ user: req.user.id, endpoint });
    } else {
      // Rimuovi TUTTE le subscription dell'utente (logout completo dalle push)
      await PushSubscription.deleteMany({ user: req.user.id });
    }

    res.json({ message: "Sottoscrizione rimossa con successo." });
  } catch (error) {
    console.error("Errore rimozione sottoscrizione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
});

// Verifica stato subscription dell'utente
router.get("/status", protect, async (req, res) => {
  try {
    const count = await PushSubscription.countDocuments({ user: req.user.id });
    res.json({
      subscribed: count > 0,
      deviceCount: count,
    });
  } catch (error) {
    console.error("Errore verifica stato push:", error);
    res.status(500).json({ message: "Errore del server." });
  }
});

// Test push (invariato)
router.post("/test-push", protect, async (req, res) => {
  try {
    const subs = await PushSubscription.find({ user: req.user.id });
    
    const payload = JSON.stringify({
      title: "Test Push 🚀",
      body: "Questa è una notifica di prova! Skibidi!",
      url: "/",
      tag: "test-push",
      renotify: true,
      timestamp: Date.now(),
      vibrate: [100, 50, 100],
      actions: [
        { action: "view", title: "Apri App" }
      ]
    });

    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys
        }, payload).catch(async (err) => {
          if (err.statusCode === 410 || err.statusCode === 404 || err.statusCode === 403) {
            await sub.deleteOne().catch(() => {});
          }
          throw err;
        })
      )
    );

    const succeeded = results.filter(r => r.status === "fulfilled").length;
    const failed = results.filter(r => r.status === "rejected").length;

    res.status(200).json({ 
      message: "Push triggerate!",
      sent: succeeded,
      failed: failed,
      total_devices: subs.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore durante push." });
  }
});

module.exports = router;
