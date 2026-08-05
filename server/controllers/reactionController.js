const Review = require("../models/Review");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendPushNotification } = require("../services/pushService");

// Funzione per aggiungere o modificare una reazione
exports.addOrUpdateReaction = async (req, res) => {
  const { reviewId } = req.params;
  const { reaction_type } = req.body;
  const userId = req.user.id;

  try {
    const review = await Review.findById(reviewId).populate("movie", "title poster_path");
    if (!review)
      return res.status(404).json({ message: "Recensione non trovata." });

    // Controlla se l'utente ha già fatto questa reazione
    const existingIndex = review.reactions.findIndex(
      (reaction) => reaction.user.toString() === userId && reaction.reaction_type === reaction_type
    );

    // Rimuovi la vecchia reazione dell'utente, se esiste (a prescindere dal tipo)
    review.reactions = review.reactions.filter(
      (reaction) => reaction.user.toString() !== userId
    );

    // Se la reazione NON era identica a quella di prima, aggiungici (altrimenti si è appena toggle-offata)
    if (existingIndex === -1) {
      review.reactions.push({ user: userId, reaction_type });
    }
    
    await review.save();

    // Crea una notifica per l'autore della recensione (se non è l'utente stesso)
    if (review.user.toString() !== userId) {
      const notification = new Notification({
        recipient: review.user,
        sender: userId,
        type: "new_reaction",
        targetReview: review._id,
      });
      await notification.save();

      // Invia notifica Push all'autore della review
      try {
        const reactor = await User.findById(userId).select("username avatar_url");
        const movieTitle = review.movie?.title ? `su ${review.movie.title}` : "alla tua recensione";
        const reactionEmoji = reaction_type === "like" ? "❤️" : reaction_type === "fire" ? "🔥" : reaction_type === "laugh" ? "😂" : "👍";
        
        await sendPushNotification(review.user, {
          title: `${reactor?.username || "Qualcuno"} ha reagito ${reactionEmoji}`,
          body: `Ha aggiunto una reazione alla tua recensione ${movieTitle}.`,
          icon: reactor?.avatar_url || "/pwa-192x192.png",
          url: `/`
        });
      } catch (err) {
        console.error("Errore Push Reaction:", err);
      }
    }

    res.json(review);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per rimuovere una reazione
exports.removeReaction = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id;

  try {
    await Review.findByIdAndUpdate(reviewId, {
      $pull: { reactions: { user: userId } },
    });
    res.json({ message: "Reazione rimossa." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
