const Review = require("../models/Review");
const Notification = require("../models/Notification");
const User = require("../models/User");
const PushSubscription = require("../models/PushSubscription");
const webpush = require("web-push");

async function sendPushNotification(userId, title, body, url) {
  try {
    const subs = await PushSubscription.find({ user: userId });
    if (subs.length > 0) {
      const payload = JSON.stringify({ title, body, url });
      for (let sub of subs) {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        ).catch(async err => {
          if (err.statusCode === 410) {
            await sub.deleteOne();
          }
        });
      }
    }
  } catch (e) {
    console.error("Push Notification Error:", e);
  }
}


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
  const { reviewId } = req.params;
  const { comment_text } = req.body;
  const userId = req.user.id;

  if (!comment_text || typeof comment_text !== "string" || comment_text.trim() === "") {
    return res.status(400).json({ message: "Il testo del commento non può essere vuoto." });
  }

  try {
    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    const newComment = {
      user: userId,
      comment_text: comment_text.trim(),
      createdAt: new Date(),
    };

    review.comments.push(newComment);
    await review.save();

    await review.populate("comments.user", "username avatar_url");

    const populatedComments = review.comments.filter((comment) => comment.user);

    const senderUser = await User.findById(userId).select("username");
    const senderName = senderUser ? senderUser.username : "Un utente";

    // 1. Notifica al creatore della recensione (se non è lui stesso a commentare)
    if (review.user.toString() !== userId) {
      try {
        await new Notification({
          recipient: review.user,
          sender: userId,
          type: "new_comment",
          targetReview: review._id,
        }).save();
        await sendPushNotification(
          review.user,
          "Nuovo commento!",
          `${senderName} ha commentato la tua recensione.`,
          `/`
        );
      } catch (err) {
        console.error("⚠️ Errore notifica autore recensione:", err.message);
      }
    }

    // 2. Notifica per @mention nel commento
    try {
      const mentionedIds = await extractMentions(comment_text);
      const validMentions = mentionedIds.filter(
        (id) => id.toString() !== userId && id.toString() !== review.user.toString()
      );
      for (const mentionId of validMentions) {
        await new Notification({
          recipient: mentionId,
          sender: userId,
          type: "comment_mention",
          targetReview: review._id,
        }).save();
        await sendPushNotification(
          mentionId,
          "Sei stato menzionato!",
          `${senderName} ti ha menzionato in un commento.`,
          `/`
        );
      }
    } catch (err) {
      console.error("⚠️ Errore notifica mention commento:", err.message);
    }

    // 3. Notifica agli altri partecipanti al thread (escludi autore recensione già notificato)
    try {
      const otherCommenters = [
        ...new Set(
          review.comments
            .map((c) => (c.user ? c.user._id?.toString() || c.user.toString() : null))
            .filter(
              (id) =>
                id &&
                id !== userId &&
                id !== review.user.toString()
            )
        ),
      ];

      for (const commenterId of otherCommenters) {
        await new Notification({
          recipient: commenterId,
          sender: userId,
          type: "thread_comment",
          targetReview: review._id,
        }).save();
        await sendPushNotification(
          commenterId,
          "Nuovo commento nel thread!",
          `${senderName} ha risposto a una recensione che segui.`,
          `/`
        );
      }
    } catch (err) {
      console.error("⚠️ Errore notifica thread:", err.message);
    }

    res.status(201).json(populatedComments);
  } catch (error) {
    console.error("❌ Errore in addComment:", error);
    res.status(500).json({ message: "Errore del server.", error: error.message });
  }
};

exports.getComments = async (req, res) => {
  const { reviewId } = req.params;
  try {
    const review = await Review.findById(reviewId).populate(
      "comments.user",
      "username avatar_url"
    );

    if (!review) {
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    const validComments = review.comments.filter((comment) => comment.user);
    res.json(validComments);
  } catch (error) {
    console.error("❌ Errore in getComments:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.toggleCommentLike = async (req, res) => {
  const { reviewId, commentId } = req.params;
  const userId = req.user.id;

  try {
    const review = await Review.findById(reviewId);
    if (!review) return res.status(404).json({ message: "Recensione non trovata." });

    const comment = review.comments.id(commentId);
    if (!comment) return res.status(404).json({ message: "Commento non trovato." });

    const likeIndex = comment.likes.indexOf(userId);
    if (likeIndex === -1) {
      comment.likes.push(userId); // aggiungi like
    } else {
      comment.likes.splice(likeIndex, 1); // rimuovi like
    }

    await review.save();
    
    // Potremmo anche inviare una notifica a comment.user se e' un like nuovo e non self-like, 
    // ma teniamolo semplice e restituiamo i like agionati.
    res.json({ likes: comment.likes });
  } catch (err) {
    console.error("Errore toggleCommentLike:", err);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.deleteComment = async (req, res) => {
  const { reviewId, commentId } = req.params;
  const userId = req.user.id;

  try {
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    const commentIndex = review.comments.findIndex(
      (comment) => comment._id.toString() === commentId
    );

    if (commentIndex === -1) {
      return res.status(404).json({ message: "Commento non trovato." });
    }

    const comment = review.comments[commentIndex];

    if (comment.user.toString() !== userId) {
      return res.status(403).json({ message: "Non hai i permessi per eliminare questo commento." });
    }

    review.comments.splice(commentIndex, 1);
    await review.save();

    res.json({ message: "Commento eliminato con successo." });
  } catch (error) {
    console.error("❌ Errore in deleteComment:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
