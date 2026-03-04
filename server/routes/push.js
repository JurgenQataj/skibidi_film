const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const PushSubscription = require("../models/PushSubscription");
const { protect } = require("../middleware/authMiddleware");

// Configura web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:jurgen126q@gmail.com", // Cambiare in prod
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
      return res.status(200).json({ message: "Sottoscrizione già esistente." });
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

// Aumenta questa rotta per inviare i messaggi push in un secondo momento, se richiamata internamente
// Esempio:
router.post("/test-push", protect, async (req, res) => {
  try {
    const subs = await PushSubscription.find({ user: req.user.id });
    
    const payload = JSON.stringify({
      title: "Test Push",
      body: "Questa è una notifica di prova! Skibidi!",
      url: "/"
    });

    for (let sub of subs) {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: sub.keys
      }, payload).catch(err => {
        if (err.statusCode === 410) {
          sub.deleteOne(); // Subscription is no longer valid
        }
      });
    }

    res.status(200).json({ message: "Push triggerate!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore durante push." });
  }
});

module.exports = router;
