const Notification = require("../models/Notification");
const Review = require("../models/Review"); // Importa il modello Review

// Ottenere le notifiche dell'utente loggato
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate("sender", "username avatar_url _id")
      .populate({
        path: "targetReview",
        // Popola il film dentro la recensione
        populate: {
          path: "movie",
          model: "Movie", // Specifica il modello
          select: "tmdb_id title poster_path",
        },
      })
      .sort({ createdAt: -1 });

    // **Filtro di sicurezza per rimuovere dati corrotti**
    const validNotifications = notifications.filter((n) => {
      if (n.type === "new_follower") return true; // I 'follow' sono sempre validi
      // Per like e commenti, assicurati che la recensione e il film esistano
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
    await Notification.updateMany(
      { recipient: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ message: "Notifiche segnate come lette." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
