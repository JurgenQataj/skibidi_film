import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import styles from "./ReviewCard.module.css";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { jwtDecode } from "jwt-decode";

function ReviewCard({ review, onInteraction }) {
  // Controllo di sicurezza per dati incompleti
  if (!review || !review.movie || !review.user || !review.movie.tmdb_id) {
    return null;
  }

  const [comments, setComments] = useState({ shown: false, list: [] });
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(null);

  const token = localStorage.getItem("token");
  const loggedInUserId = token ? jwtDecode(token).user.id : null;

  const posterBaseUrl = "https://image.tmdb.org/t/p/w200";
  const placeholderPoster =
    "https://via.placeholder.com/200x300.png?text=No+Image";
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleReaction = async (reactionType) => {
    if (!token) return;

    try {
      await axios.post(
        `${API_URL}/api/reactions/reviews/${review._id}`,
        { reaction_type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onInteraction) onInteraction();
    } catch (error) {
      console.error("Errore reazione:", error);
      alert(error.response?.data?.message || "Errore");
    }
  };

  const toggleComments = async () => {
    console.log("🐛 FRONTEND - toggleComments chiamata");

    if (comments.shown) {
      console.log("🐛 FRONTEND - Nascondendo commenti");
      setComments({ shown: false, list: [] });
    } else {
      console.log("🐛 FRONTEND - Caricando commenti per review:", review._id);
      try {
        const response = await axios.get(
          `${API_URL}/api/comments/reviews/${review._id}`
        );
        console.log("✅ FRONTEND - Commenti caricati:", response.data?.length);
        setComments({ shown: true, list: response.data || [] });
      } catch (error) {
        console.error("❌ FRONTEND - Errore caricamento commenti:", error);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    console.log("🐛 FRONTEND - handleAddComment chiamata");
    console.log("🐛 FRONTEND - commentText:", `"${commentText}"`);
    console.log("🐛 FRONTEND - commentText type:", typeof commentText);
    console.log("🐛 FRONTEND - commentText length:", commentText?.length);
    console.log("🐛 FRONTEND - commentText.trim():", `"${commentText.trim()}"`);

    if (!commentText.trim()) {
      console.log("❌ FRONTEND - Commento vuoto dopo validazione");
      alert("Il commento non può essere vuoto.");
      return;
    }

    if (!token) {
      console.log("❌ FRONTEND - Nessun token");
      alert("Devi essere loggato per commentare.");
      return;
    }

    console.log("✅ FRONTEND - Validazione superata, invio richiesta...");
    setIsSubmittingComment(true);

    const payload = { comment_text: commentText.trim() };
    console.log("🐛 FRONTEND - Payload da inviare:", payload);
    console.log("🐛 FRONTEND - Payload JSON:", JSON.stringify(payload));

    try {
      console.log(
        "🐛 FRONTEND - URL target:",
        `${API_URL}/api/comments/reviews/${review._id}`
      );
      console.log("🐛 FRONTEND - Review ID:", review._id);

      const response = await axios.post(
        `${API_URL}/api/comments/reviews/${review._id}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ FRONTEND - Risposta ricevuta:", response.status);
      console.log("🐛 FRONTEND - Dati risposta:", response.data);
      console.log(
        "🐛 FRONTEND - Numero commenti ricevuti:",
        response.data?.length
      );
      console.log(
        "🐛 FRONTEND - Primi 2 commenti:",
        response.data?.slice(0, 2)
      );

      setCommentText("");
      setComments({ shown: true, list: response.data || [] });

      if (onInteraction) {
        console.log("🐛 FRONTEND - Chiamando onInteraction");
        onInteraction();
      }
    } catch (error) {
      console.error("❌ FRONTEND - Errore nella richiesta:", error);
      console.error("❌ FRONTEND - Error response:", error.response?.data);
      console.error("❌ FRONTEND - Error status:", error.response?.status);
      console.error("❌ FRONTEND - Error message:", error.message);

      const errorMessage =
        error.response?.data?.message || "Errore nell'invio del commento.";
      alert(errorMessage);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    console.log("🐛 FRONTEND - handleDeleteComment chiamata");
    console.log("🐛 FRONTEND - commentId:", commentId);
    console.log("🐛 FRONTEND - review._id:", review._id);

    if (!window.confirm("Sei sicuro di voler eliminare questo commento?")) {
      return;
    }

    setIsDeletingComment(commentId);

    try {
      console.log(
        "🐛 FRONTEND - URL eliminazione:",
        `${API_URL}/api/comments/reviews/${review._id}/${commentId}`
      );

      const deleteResponse = await axios.delete(
        `${API_URL}/api/comments/reviews/${review._id}/${commentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log(
        "✅ FRONTEND - Eliminazione completata:",
        deleteResponse.status
      );
      console.log("🐛 FRONTEND - Risposta eliminazione:", deleteResponse.data);

      // Ricarica i commenti
      console.log("🐛 FRONTEND - Ricaricando commenti dopo eliminazione...");
      const response = await axios.get(
        `${API_URL}/api/comments/reviews/${review._id}`
      );

      console.log(
        "🐛 FRONTEND - Commenti dopo eliminazione:",
        response.data?.length
      );
      console.log("🐛 FRONTEND - Lista commenti aggiornata:", response.data);

      setComments({ shown: true, list: response.data || [] });

      if (onInteraction) {
        console.log("🐛 FRONTEND - Chiamando onInteraction dopo eliminazione");
        onInteraction();
      }
    } catch (error) {
      console.error("❌ FRONTEND - Errore eliminazione:", error);
      console.error("❌ FRONTEND - Error response:", error.response?.data);
      console.error("❌ FRONTEND - Error status:", error.response?.status);

      const errorMessage =
        error.response?.data?.message ||
        "Errore durante l'eliminazione del commento.";
      alert(errorMessage);
    } finally {
      setIsDeletingComment(null);
    }
  };

  const timeAgo = (date) => {
    try {
      return formatDistanceToNow(new Date(date), {
        addSuffix: true,
        locale: it,
      });
    } catch (error) {
      return "";
    }
  };

  const { movie, user, rating, comment_text, createdAt } = review;
  const reactionCount =
    review.reactions?.reduce(
      (acc, r) => ({
        ...acc,
        [r.reaction_type]: (acc[r.reaction_type] || 0) + 1,
      }),
      {}
    ).love || 0;
  const commentCount = review.comments?.length || 0;

  return (
    <div className={styles.card}>
      <Link to={`/movie/${movie.tmdb_id}`}>
        <img
          src={
            movie.poster_path
              ? `${posterBaseUrl}${movie.poster_path}`
              : placeholderPoster
          }
          alt={`Locandina di ${movie.title}`}
          className={styles.poster}
        />
      </Link>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link to={`/profile/${user._id}`} className={styles.authorLink}>
            {user.username || "Utente"}
          </Link>
          <span> ha recensito </span>
          <Link
            to={`/movie/${movie.tmdb_id}`}
            className={styles.movieTitleLink}
          >
            {movie.title}
          </Link>
        </div>
        <div className={styles.rating}>
          Voto: <span className={styles.ratingValue}>{rating}</span>
        </div>
        {comment_text && <p className={styles.comment}>"{comment_text}"</p>}
        <div className={styles.timestamp}>{timeAgo(createdAt)}</div>

        {token && (
          <div className={styles.actions}>
            <div className={styles.reactions}>
              <button
                onClick={() => handleReaction("love")}
                title="Love"
                disabled={!loggedInUserId}
              >
                ❤️
              </button>
              <span>{reactionCount}</span>
            </div>
            <button onClick={toggleComments} className={styles.commentToggle}>
              {comments.shown ? "Chiudi" : "Commenti"} ({commentCount})
            </button>
          </div>
        )}

        {comments.shown && (
          <div className={styles.commentsSection}>
            {comments.list.length > 0 ? (
              comments.list
                .filter((c) => c.user && c.user._id) // Filtro migliorato
                .map((comment) => (
                  <div key={comment._id} className={styles.commentItem}>
                    <div className={styles.commentContent}>
                      <Link
                        to={`/profile/${comment.user._id}`}
                        className={styles.authorLink}
                      >
                        <strong>{comment.user.username}:</strong>
                      </Link>
                      <span> {comment.comment_text}</span>
                    </div>
                    {loggedInUserId === comment.user._id && (
                      <button
                        onClick={() => handleDeleteComment(comment._id)}
                        className={styles.deleteCommentButton}
                        disabled={isDeletingComment === comment._id}
                      >
                        {isDeletingComment === comment._id ? "..." : "×"}
                      </button>
                    )}
                  </div>
                ))
            ) : (
              <p>Nessun commento ancora.</p>
            )}

            {token && (
              <form onSubmit={handleAddComment} className={styles.commentForm}>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Rispondi..."
                  disabled={isSubmittingComment}
                  maxLength={500} // Limite di caratteri
                />
                <button
                  type="submit"
                  disabled={isSubmittingComment || !commentText.trim()}
                >
                  {isSubmittingComment ? "..." : "Invia"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewCard;
