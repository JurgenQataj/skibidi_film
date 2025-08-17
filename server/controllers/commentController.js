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

    review.comments.push({ user: userId, comment_text: comment_text.trim() });
    await review.save();

    // Crea una notifica per l'autore della recensione
    if (review.user.toString() !== userId) {
      const notification = new Notification({
        recipient: review.user,
        sender: userId,
        type: "new_comment",
        targetReview: review._id,
      });
      await notification.save();
    }

    res.status(201).json(review.comments);
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

    const comment = review.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Commento non trovato." });
    }

    if (comment.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: "Non hai i permessi per eliminare questo commento." });
    }

    // Rimuovi il commento dall'array
    review.comments.pull({ _id: commentId });
    await review.save();

    res.json({ message: "Commento eliminato con successo." });
  } catch (error) {
    console.error("Errore eliminazione commento:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
