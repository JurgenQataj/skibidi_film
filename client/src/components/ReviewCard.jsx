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
    if (comments.shown) {
      setComments({ shown: false, list: [] });
    } else {
      try {
        // highlight-next-line
        const response = await axios.get(
          `${API_URL}/api/reviews/${review._id}/comments`
        );
        setComments({ shown: true, list: response.data || [] });
      } catch (error) {
        console.error("Errore caricamento commenti:", error);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();

    if (!commentText.trim()) {
      alert("Il commento non può essere vuoto.");
      return;
    }

    if (!token) {
      alert("Devi essere loggato per commentare.");
      return;
    }

    setIsSubmittingComment(true);
    const payload = { comment_text: commentText.trim() };

    try {
      const response = await axios.post(
        // highlight-next-line
        `${API_URL}/api/reviews/${review._id}/comments`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setCommentText("");
      setComments({ shown: true, list: response.data || [] });

      if (onInteraction) {
        onInteraction();
      }
    } catch (error) {
      console.error("Errore nella richiesta:", error);
      const errorMessage =
        error.response?.data?.message || "Errore nell'invio del commento.";
      alert(errorMessage);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo commento?")) {
      return;
    }

    setIsDeletingComment(commentId);

    try {
      await axios.delete(
        // highlight-next-line
        `${API_URL}/api/reviews/${review._id}/comments/${commentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const response = await axios.get(
        // highlight-next-line
        `${API_URL}/api/reviews/${review._id}/comments`
      );

      setComments({ shown: true, list: response.data || [] });

      if (onInteraction) {
        onInteraction();
      }
    } catch (error) {
      console.error("Errore eliminazione:", error);
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
                .filter((c) => c.user && c.user._id)
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
                  maxLength={500}
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
