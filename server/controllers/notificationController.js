// server/controllers/notificationController.js

const Notification = require("../models/Notification");
const Review = require("../models/Review");

// Ottenere le notifiche dell'utente loggato (INVARIATO)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate("sender", "username avatar_url _id")
      .populate({
        path: "targetReview",
        populate: {
          path: "movie",
          model: "Movie",
          select: "tmdb_id title poster_path",
        },
      })
      .sort({ createdAt: -1 });

    const validNotifications = notifications.filter((n) => {
      if (n.type === "new_follower") return true;
      return n.targetReview && n.targetReview.movie;
    });

    res.json(validNotifications);
  } catch (error) {
    console.error("Errore nel recupero delle notifiche:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Marcare tutte le notifiche come lette
exports.markAsRead = async (req, res) => {
  try {
    // Aggiorna le notifiche nel database
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    // *** NUOVA PARTE: Recupera e restituisci le notifiche aggiornate ***
    const updatedNotifications = await Notification.find({
      recipient: req.user.id,
    })
      .populate("sender", "username avatar_url _id")
      .populate({
        path: "targetReview",
        populate: {
          path: "movie",
          model: "Movie",
          select: "tmdb_id title poster_path",
        },
      })
      .sort({ createdAt: -1 });

    // Filtra di nuovo per sicurezza
    const validUpdatedNotifications = updatedNotifications.filter((n) => {
      if (n.type === "new_follower") return true;
      return n.targetReview && n.targetReview.movie;
    });

    res.json(validUpdatedNotifications); // Invia l'elenco aggiornato al frontend
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
