import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import styles from "./ReviewCard.module.css";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

function ReviewCard({ review, onInteraction }) {
  // CONTROLLO DI SICUREZZA FONDAMENTALE:
  // Se la recensione o i dati essenziali del film o dell'utente mancano, non renderizzare nulla.
  if (!review || !review.movie || !review.user || !review.movie.tmdb_id) {
    console.warn(
      "ReviewCard ha ricevuto dati incompleti e non verrà renderizzata:",
      review
    );
    return null;
  }

  const [comments, setComments] = useState({ shown: false, list: [] });
  const [commentText, setCommentText] = useState("");

  const posterBaseUrl = "https://image.tmdb.org/t/p/w200";
  const placeholderPoster =
    "https://via.placeholder.com/200x300.png?text=No+Image";
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const handleReaction = async (reactionType) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/reactions/reviews/${review._id}`,
        { reaction_type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (onInteraction) onInteraction();
    } catch (error) {
      alert(error.response?.data?.message || "Errore");
    }
  };

  const toggleComments = async () => {
    if (comments.shown) {
      setComments({ shown: false, list: [] });
    } else {
      try {
        const response = await axios.get(
          `${API_URL}/api/comments/reviews/${review._id}`
        );
        setComments({ shown: true, list: response.data || [] });
      } catch (error) {
        console.error("Errore caricamento commenti:", error);
      }
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/comments/reviews/${review._id}`,
        { comment_text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      toggleComments().then(() => toggleComments());
      if (onInteraction) onInteraction();
    } catch (error) {
      alert("Errore nell'invio del commento.");
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
        <p className={styles.comment}>"{comment_text}"</p>
        <div className={styles.timestamp}>{timeAgo(createdAt)}</div>
        <div className={styles.actions}>
          <div className={styles.reactions}>
            <button onClick={() => handleReaction("love")} title="Love">
              ❤️
            </button>
            <span>{reactionCount}</span>
          </div>
          <button onClick={toggleComments} className={styles.commentToggle}>
            {comments.shown ? "Chiudi" : "Commenti"} ({commentCount})
          </button>
        </div>
        {comments.shown && (
          <div className={styles.commentsSection}>
            {comments.list.length > 0 ? (
              comments.list.map((comment) => (
                <div key={comment._id} className={styles.commentItem}>
                  <Link
                    to={`/profile/${comment.user._id}`}
                    className={styles.authorLink}
                  >
                    <strong>{comment.user.username}:</strong>
                  </Link>
                  <span> {comment.comment_text}</span>
                </div>
              ))
            ) : (
              <p>Nessun commento ancora.</p>
            )}
            <form onSubmit={handleAddComment} className={styles.commentForm}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Rispondi..."
              />
              <button type="submit">Invia</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewCard;
