// ==================== STEP 1: Sostituisci commentController.js con versione DEBUG ====================
const Review = require("../models/Review");
const Notification = require("../models/Notification");
const User = require("../models/User");

// Estrae @username dal testo e restituisce gli ID utenti trovati
async function extractMentions(text) {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const usernames = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    usernames.push(match[1]);
  }
  if (usernames.length === 0) return [];
  const users = await User.find({ username: { $in: usernames } }).select("_id");
  return users.map((u) => u._id);
}

exports.addComment = async (req, res) => {
  console.log("🐛 === DEBUG addComment START ===");
  console.log("🐛 Headers:", req.headers);
  console.log("🐛 Body ricevuto:", req.body);
  console.log("🐛 Body stringified:", JSON.stringify(req.body));
  console.log("🐛 Params:", req.params);
  console.log("🐛 User da token:", req.user);

  const { reviewId } = req.params;
  const { comment_text } = req.body;
  const userId = req.user.id;

  console.log("🐛 comment_text estratto:", `"${comment_text}"`);
  console.log("🐛 comment_text type:", typeof comment_text);
  console.log("🐛 comment_text length:", comment_text?.length);

  // Validazione con log dettagliato
  if (!comment_text) {
    console.log("❌ comment_text è falsy:", comment_text);
    return res
      .status(400)
      .json({ message: "Il testo del commento non può essere vuoto." });
  }

  if (typeof comment_text !== "string") {
    console.log("❌ comment_text non è una stringa:", typeof comment_text);
    return res
      .status(400)
      .json({ message: "Il testo del commento deve essere una stringa." });
  }

  if (comment_text.trim() === "") {
    console.log(
      "❌ comment_text è vuoto dopo trim:",
      `"${comment_text.trim()}"`
    );
    return res
      .status(400)
      .json({ message: "Il testo del commento non può essere vuoto." });
  }

  console.log(
    "✅ Validazione superata, comment_text:",
    `"${comment_text.trim()}"`
  );

  try {
    console.log("🔍 Cercando recensione con ID:", reviewId);
    const review = await Review.findById(reviewId);

    if (!review) {
      console.log("❌ Recensione non trovata");
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    console.log("✅ Recensione trovata:", review._id);
    console.log("🐛 Commenti esistenti:", review.comments.length);

    const newComment = {
      user: userId,
      comment_text: comment_text.trim(),
      createdAt: new Date(),
    };

    console.log("📝 Creando nuovo commento:", newComment);

    // Aggiungi il commento
    review.comments.push(newComment);

    console.log("💾 Salvando recensione...");
    await review.save();
    console.log("✅ Recensione salvata");

    // Popola i dati dell'utente
    console.log("👤 Popolando dati utente...");
    await review.populate("comments.user", "username avatar_url");
    console.log("✅ Dati popolati");

    const populatedComments = review.comments.filter((comment) => comment.user);
    console.log("🐛 Commenti dopo populate:", populatedComments.length);
    console.log(
      "🐛 Primo commento:",
      populatedComments[populatedComments.length - 1]
    );

    // Notifica al creatore della recensione (se non è lui stesso a commentare)
    if (review.user.toString() !== userId) {
      try {
        const notification = new Notification({
          recipient: review.user,
          sender: userId,
          type: "new_comment",
          targetReview: review._id,
        });
        await notification.save();
        console.log("🔔 Notifica creata per l'autore della recensione");
      } catch (notifError) {
        console.log("⚠️ Errore notifica creatore (non critico):", notifError.message);
      }
    }

    try {
      const mentionedIds = await extractMentions(comment_text);
      const validMentions = mentionedIds.filter(id => id.toString() !== userId);
      for (const mentionId of validMentions) {
        const mentionNotif = new Notification({
          recipient: mentionId,
          sender: userId,
          type: "comment_mention",
          targetReview: review._id,
        });
        await mentionNotif.save();
      }
    } catch (mentionNotifError) {
      console.log("⚠️ Errore notifica menzione (non critico):", mentionNotifError.message);
    }

    // Notifica a TUTTI gli altri utenti che hanno commentato (Thread)
    try {
      // Trova tutti gli ID univoci degli utenti che hanno commentato finora
      // Escludi l'autore del nuovo commento e l'autore della recensione (già notificato sopra)
      const otherCommenters = [...new Set(
        review.comments
          .map(c => c.user ? c.user._id?.toString() || c.user.toString() : null)
          .filter(id => id && id !== userId && id !== review.user.toString())
      )];

      console.log(`🔔 Trovati ${otherCommenters.length} altri partecipanti alla discussione da notificare.`);

      for (const commenterId of otherCommenters) {
        const threadNotification = new Notification({
          recipient: commenterId,
          sender: userId,
          type: "new_comment", // Puoi anche creare un tipo nuovo tipo "new_thread_comment" in futuro se vuoi testo diverso
          targetReview: review._id,
        });
        await threadNotification.save();
      }
    } catch (threadNotifError) {
      console.log("⚠️ Errore notifica thread (non critico):", threadNotifError.message);
    }

    console.log("✅ Invio risposta con", populatedComments.length, "commenti");
    res.status(201).json(populatedComments);
  } catch (error) {
    console.error("❌ ERRORE CRITICO in addComment:", error);
    console.error("❌ Stack:", error.stack);
    res
      .status(500)
      .json({ message: "Errore del server.", error: error.message });
  }

  console.log("🐛 === DEBUG addComment END ===");
};

exports.getComments = async (req, res) => {
  console.log("🐛 === DEBUG getComments START ===");
  console.log("🐛 Params:", req.params);

  const { reviewId } = req.params;
  try {
    const review = await Review.findById(reviewId).populate(
      "comments.user",
      "username avatar_url"
    );

    if (!review) {
      console.log("❌ Recensione non trovata per getComments");
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    const validComments = review.comments.filter((comment) => comment.user);
    console.log(
      "🐛 getComments - trovati",
      validComments.length,
      "commenti validi"
    );

    res.json(validComments);
  } catch (error) {
    console.error("❌ Errore in getComments:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.deleteComment = async (req, res) => {
  console.log("🐛 === DEBUG deleteComment START ===");
  console.log("🐛 Params:", req.params);
  console.log("🐛 User:", req.user?.id);

  const { reviewId, commentId } = req.params;
  const userId = req.user.id;

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      console.log("❌ Recensione non trovata per deleteComment");
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    console.log("🐛 Commenti prima dell'eliminazione:", review.comments.length);

    // Trova il commento
    const commentIndex = review.comments.findIndex(
      (comment) => comment._id.toString() === commentId
    );

    console.log("🐛 Indice commento da eliminare:", commentIndex);

    if (commentIndex === -1) {
      console.log("❌ Commento non trovato nell'array");
      console.log("🐛 ID cercato:", commentId);
      console.log(
        "🐛 ID disponibili:",
        review.comments.map((c) => c._id.toString())
      );
      return res.status(404).json({ message: "Commento non trovato." });
    }

    const comment = review.comments[commentIndex];
    console.log("🐛 Commento trovato, proprietario:", comment.user.toString());
    console.log("🐛 Utente che elimina:", userId);

    if (comment.user.toString() !== userId) {
      console.log("❌ Utente non autorizzato");
      return res
        .status(403)
        .json({ message: "Non hai i permessi per eliminare questo commento." });
    }

    // Elimina il commento
    review.comments.splice(commentIndex, 1);
    await review.save();

    console.log(
      "✅ Commento eliminato, rimangono",
      review.comments.length,
      "commenti"
    );
    res.json({ message: "Commento eliminato con successo." });
  } catch (error) {
    console.error("❌ Errore in deleteComment:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
