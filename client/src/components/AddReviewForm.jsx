import React, { useState } from "react";
import axios from "axios";
import styles from "./AddReviewForm.module.css";

function AddReviewForm({ tmdbId, onReviewAdded }) {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rating) {
      setError("Devi inserire un voto.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

      await axios.post(
        `${API_URL}/api/reviews`,
        {
          tmdbId: tmdbId,
          rating: parseFloat(rating),
          comment_text: comment,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setRating("");
      setComment("");
      onReviewAdded();
    } catch (err) {
      setError(err.response?.data?.message || "Si è verificato un errore.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.formContainer}>
      <h3>Lascia la tua Recensione</h3>
      <div className={styles.inputGroup}>
        <label>Voto (0.0 - 10.0)</label>
        <input
          type="number"
          step="0.1"
          min="0"
          max="10"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className={styles.ratingInput}
        />
      </div>
      <div className={styles.inputGroup}>
        <label>Commento (opzionale)</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className={styles.commentTextarea}
          rows="4"
        />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.submitButton}>
        Invia Recensione
      </button>
    </form>
  );
}

export default AddReviewForm;
