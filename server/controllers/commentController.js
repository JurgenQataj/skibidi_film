const Review = require("../models/Review");
const Notification = require("../models/Notification");

// Aggiungere un commento a una recensione
exports.addComment = async (req, res) => {
  const { reviewId } = req.params;
  const { comment_text } = req.body;
  const userId = req.user.id;

  // Validazione robusta per prevenire commenti vuoti
  if (
    !comment_text ||
    typeof comment_text !== "string" ||
    comment_text.trim() === ""
  ) {
    return res
      .status(400)
      .json({ message: "Il testo del commento non può essere vuoto." });
  }

  try {
    const review = await Review.findById(reviewId);
    if (!review)
      return res.status(404).json({ message: "Recensione non trovata." });

    // Aggiungi il commento
    const newComment = {
      user: userId,
      comment_text: comment_text.trim(),
      createdAt: new Date(),
    };

    review.comments.push(newComment);
    await review.save();

    // Popola i dati dell'utente nel commento appena aggiunto
    await review.populate("comments.user", "username avatar_url");

    // Crea una notifica per l'autore della recensione
    if (review.user.toString() !== userId) {
      try {
        const notification = new Notification({
          recipient: review.user,
          sender: userId,
          type: "new_comment",
          targetReview: review._id,
        });
        await notification.save();
      } catch (notifError) {
        console.error("Errore creazione notifica:", notifError);
        // Non bloccare la risposta per errori di notifica
      }
    }

    // Restituisci i commenti popolati
    const populatedComments = review.comments.filter((comment) => comment.user);

    res.status(201).json(populatedComments);
  } catch (error) {
    console.error("Errore durante l'aggiunta del commento:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Ottenere tutti i commenti di una recensione
exports.getComments = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const review = await Review.findById(reviewId).populate(
      "comments.user",
      "username avatar_url"
    );

    if (!review)
      return res.status(404).json({ message: "Recensione non trovata." });

    // Filtro di sicurezza per commenti di utenti eliminati
    const validComments = review.comments.filter((comment) => comment.user);

    res.json(validComments);
  } catch (error) {
    console.error("Errore nel recupero dei commenti:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Eliminare un commento
exports.deleteComment = async (req, res) => {
  const { reviewId, commentId } = req.params;
  const userId = req.user.id;

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    // Trova il commento usando l'ID
    const commentIndex = review.comments.findIndex(
      (comment) => comment._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Commento non trovato." });
    }

    const comment = review.comments[commentIndex];

    // Verifica che l'utente sia il proprietario del commento
    if (comment.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Non hai i permessi per eliminare questo commento." });
    }

    // Rimuovi il commento dall'array
    review.comments.splice(commentIndex, 1);
    await review.save();

    res.json({ message: "Commento eliminato con successo." });
  } catch (error) {
    console.error("Errore eliminazione commento:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
