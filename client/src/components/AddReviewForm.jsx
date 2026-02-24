import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import styles from "./AddReviewForm.module.css";

function AddReviewForm({ tmdbId, mediaType = "movie", onReviewAdded }) {
  const [rating, setRating] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!mentionSearch) {
      setMentionUsers([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const res = await axios.get(
          `${API_URL}/api/users/search?q=${mentionSearch}&limit=5`
        );
        setMentionUsers(res.data || []);
      } catch {
        setMentionUsers([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [mentionSearch]);

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setComment(value);
    const cursor = e.target.selectionStart;
    const upToCursor = value.slice(0, cursor);
    const atMatch = upToCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionSearch(atMatch[1]);
      setMentionPosition(upToCursor.lastIndexOf("@"));
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionSearch("");
      setMentionPosition(null);
    }
  };

  const handleSelectMention = (username) => {
    if (mentionPosition === null) return;
    const before = comment.slice(0, mentionPosition);
    const after = comment.slice(mentionPosition + mentionSearch.length + 1);
    setComment(`${before}@${username} ${after}`);
    setShowMentionDropdown(false);
    setMentionSearch("");
    setMentionPosition(null);
    inputRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!rating) {
      setError("Devi inserire un voto.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const API_URL = import.meta.env.VITE_API_URL || "";

      await axios.post(
        `${API_URL}/api/reviews`,
        {
          tmdbId: tmdbId,
          mediaType: mediaType,
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
      <div className={styles.inputGroup} style={{ position: "relative" }}>
        <label>Commento (opzionale)</label>
        {showMentionDropdown && mentionUsers.length > 0 && (
          <div className={styles.mentionDropdown}>
            {mentionUsers.map((u) => (
              <button
                key={u._id}
                type="button"
                className={styles.mentionOption}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectMention(u.username);
                }}
              >
                <img
                  src={
                    u.avatar_url ||
                    "https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png"
                  }
                  alt={u.username}
                  className={styles.mentionAvatar}
                />
                <span>@{u.username}</span>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={comment}
          onChange={handleCommentChange}
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
