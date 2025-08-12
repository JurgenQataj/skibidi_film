import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import styles from "./ReviewCard.module.css";

function ReviewCard({ review, onInteraction }) {
  const [comments, setComments] = useState({ shown: false, list: [] });
  const [commentText, setCommentText] = useState("");

  const posterBaseUrl = "https://image.tmdb.org/t/p/w200";
  const placeholderPoster =
    "https://via.placeholder.com/200x300.png?text=No+Image";

  // Definiamo l'URL del nostro backend
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  if (!review) return null;

  const handleReaction = async (reactionType) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/reactions/reviews/${review.id}`, // <--- USA API_URL
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
      return;
    }
    try {
      const response = await axios.get(
        `${API_URL}/api/comments/reviews/${review.id}` // <--- USA API_URL
      );
      setComments({ shown: true, list: response.data || [] });
    } catch (error) {
      console.error("Errore caricamento commenti:", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/comments/reviews/${review.id}`, // <--- USA API_URL
        { comment_text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      if (onInteraction) onInteraction();
    } catch (error) {
      alert("Errore nell'invio del commento.");
    }
  };

  return (
    <div className={styles.card}>
      <Link to={`/movie/${review.tmdb_id}`}>
        <img
          src={
            review.poster_path
              ? `${posterBaseUrl}${review.poster_path}`
              : placeholderPoster
          }
          alt={`Locandina di ${review.movie_title || "Film"}`}
          className={styles.poster}
        />
      </Link>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link
            to={`/profile/${review.author_id}`}
            className={styles.authorLink}
          >
            {review.review_author || "Utente"}
          </Link>
          <span> ha recensito </span>
          <Link
            to={`/movie/${review.tmdb_id}`}
            className={styles.movieTitleLink}
          >
            {review.movie_title || "un film"}
          </Link>
        </div>
        <div className={styles.rating}>
          Voto: <span className={styles.ratingValue}>{review.rating}</span>
        </div>
        <p className={styles.comment}>"{review.comment_text}"</p>
        <div className={styles.actions}>
          <div className={styles.reactions}>
            <button onClick={() => handleReaction("love")} title="Love">
              ❤️
            </button>
            <span>{review.reactions?.love || 0}</span>
          </div>
          <button onClick={toggleComments} className={styles.commentToggle}>
            {comments.shown ? "Chiudi" : "Commenti"} (
            {review.comment_count || 0})
          </button>
        </div>
        {comments.shown && (
          <div className={styles.commentsSection}>
            {comments.list.map((comment) => (
              <div key={comment.id} className={styles.commentItem}>
                <Link
                  to={`/profile/${comment.user_id}`}
                  className={styles.authorLink}
                >
                  <strong>{comment.username}:</strong>
                </Link>
                <span> {comment.comment_text}</span>
              </div>
            ))}
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
