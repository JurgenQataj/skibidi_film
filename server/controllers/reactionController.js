const Review = require("../models/Review");
const Notification = require("../models/Notification");

// Funzione per aggiungere o modificare una reazione
exports.addOrUpdateReaction = async (req, res) => {
  const { reviewId } = req.params;
  const { reaction_type } = req.body;
  const userId = req.user.id;

  try {
    const review = await Review.findById(reviewId);
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
        const PushSubscription = require("../models/PushSubscription");
        const webpush = require("web-push");
        const User = require("../models/User");

        const subs = await PushSubscription.find({ user: review.user });
        if (subs.length > 0) {
          const reactor = await User.findById(userId).select("username");
          const payload = JSON.stringify({
            title: "Nuova Reazione!",
            body: `${reactor.username} ha reagito alla tua recensione.`,
            url: `/`
          });
          
          for (let sub of subs) {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              payload
            ).catch(async err => {
              if (err.statusCode === 410) {
                await sub.deleteOne();
              } else {
                console.error("Push Notification Delivery Error (non-410):", err);
              }
            });
          }
        }
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
