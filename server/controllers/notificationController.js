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

    // Rimuoviamo il filtro severo che svuotava l'array se un film era stato eliminato
    // ma passiamo tutto al frontend, che ha adesso i fallback necessari per non esplodere.
    const validNotifications = notifications.filter((n) => {
      // Se manca il mittente (utente eliminato), la passiamo comunque e il frontend mostrerà "Utente eliminato"
      return true; 
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
      // Come sopra, permettiamo a tutte di passare per non svuotare la lista.
      return true;
    });

    res.json(validUpdatedNotifications); // Invia l'elenco aggiornato al frontend
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
