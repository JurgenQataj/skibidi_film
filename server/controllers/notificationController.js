const Notification = require("../models/Notification");

// Ottenere le notifiche dell'utente loggato
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate("sender", "username avatar_url") // Aggiunge i dati di chi ha inviato la notifica
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Marcare tutte le notifiche come lette
exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "Notifiche segnate come lette." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
