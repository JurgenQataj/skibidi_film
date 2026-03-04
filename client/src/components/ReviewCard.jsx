import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaRegHeart, FaHeart, FaRegComment } from "react-icons/fa";
import axios from "axios";
import styles from "./ReviewCard.module.css";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";
import { jwtDecode } from "jwt-decode";

function renderText(text) {
  if (!text) return null;
  return text.split(/(@\w+)/g).map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className={styles.mentionTag}>{part}</span>
      : part
  );
}

function ReviewCard({ review, onInteraction }) {
  const [comments, setComments] = useState({ shown: false, list: [] });
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isDeletingComment, setIsDeletingComment] = useState(null);

  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionUsers, setMentionUsers] = useState([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionPosition, setMentionPosition] = useState(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem("token");
  const loggedInUserId = token ? jwtDecode(token).user.id : null;

  const posterBaseUrl = "https://image.tmdb.org/t/p/w500";
  const placeholderPoster =
    "https://placehold.co/300x450/1a1a2e/666?text=No+Image";
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    if (!mentionSearch) {
      setMentionUsers([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/users/search?q=${mentionSearch}&limit=5`
        );
        setMentionUsers(res.data || []);
      } catch {
        setMentionUsers([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [mentionSearch, API_URL]);

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setCommentText(value);
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
    const before = commentText.slice(0, mentionPosition);
    const after = commentText.slice(mentionPosition + mentionSearch.length + 1);
    setCommentText(`${before}@${username} ${after}`);
    setShowMentionDropdown(false);
    setMentionSearch("");
    setMentionPosition(null);
    inputRef.current?.focus();
  };

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

  const fetchCommentList = async () => {
    const response = await axios.get(
      `${API_URL}/api/comments/review/${review._id}`
    );
    return response.data || [];
  };

  const toggleComments = async () => {
    if (comments.shown) {
      setComments({ shown: false, list: [] });
      return;
    }
    try {
      const list = await fetchCommentList();
      setComments({ shown: true, list });
    } catch (error) {
      console.error("Errore caricamento commenti:", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return alert("Il commento non può essere vuoto.");
    if (!token) return alert("Devi essere loggato per commentare.");

    setIsSubmittingComment(true);
    const payload = { comment_text: commentText.trim() };
    try {
      const response = await axios.post(
        `${API_URL}/api/comments/review/${review._id}`,
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
      if (onInteraction) onInteraction();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Errore nell'invio del commento.";
      alert(msg);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo commento?"))
      return;

    setIsDeletingComment(commentId);
    try {
      await axios.delete(
        `${API_URL}/api/comments/review/${review._id}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const response = await axios.get(
        `${API_URL}/api/comments/review/${review._id}`
      );
      setComments({ shown: true, list: response.data || [] });
      if (onInteraction) onInteraction();
    } catch (error) {
      const msg =
        error.response?.data?.message || "Errore durante l'eliminazione.";
      alert(msg);
    } finally {
      setIsDeletingComment(null);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Sei sicuro di voler eliminare questo annuncio?")) return;
    try {
      await axios.delete(`${API_URL}/api/posts/${review._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (onInteraction) onInteraction();
    } catch (err) {
      alert("Errore durante l'eliminazione dell'annuncio.");
    }
  };

  // Il resto del componente rimane invariato...
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

  if (!review || !review.user) {
    return null;
  }
  
  if (!review.isPost && (!review.movie || !review.movie.tmdb_id)) {
    return null;
  }

  const { user, createdAt } = review;
  const isPost = review.isPost;
  
  const movie = isPost ? null : review.movie;
  const rating = isPost ? null : review.rating;
  const comment_text = isPost ? review.text : review.comment_text; 

  const reactionCount =
    Array.isArray(review.reactions) ?
    review.reactions.filter((r) => r.reaction_type === "love").length 
    : (review.reactions?.love || 0);
  
  const rawReactions = review.user_reactions || (Array.isArray(review.reactions) ? review.reactions : []);
  const hasLoved = rawReactions.some(
    (r) => r.user?.toString() === loggedInUserId && r.reaction_type === "love"
  );

  const commentCount = review.comments?.length || review.comment_count || 0;

  // --- RENDERING PER ANNUNCI ADMIN ---
  if (isPost) {
    return (
      <div className={`${styles.card} ${styles.adminPostCard}`}>
        <div className={styles.adminPostHeader}>
          <div className={styles.adminPostHeaderTopLayer}>
            <span className={styles.adminBadge}>ADMIN</span>
            <span className={styles.adminPinnedText}>📌 Pinnato per 7 giorni</span>
          </div>
          
          <div className={styles.userInfoWrapper} style={{ marginTop: "4px", width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Link to={`/profile/${user._id}`} className={styles.authorLink} style={{ fontSize: "0.95rem" }}>
              {user.username || "Admin"}
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <img
                src={
                  user.avatar_url ||
                  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png"
                }
                alt="avatar"
                className={styles.userAvatar}
              />
              {loggedInUserId === user._id && (
                <button
                  onClick={handleDeletePost}
                  className={styles.deleteCommentButton}
                  title="Elimina annuncio"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.adminPostBody}>
          {comment_text && <p className={styles.comment}>{renderText(comment_text)}</p>}
        </div>
        
        <div className={styles.footerRow}>
          <div className={styles.timestamp}>{timeAgo(createdAt)}</div>
        </div>
      </div>
    );
  }

  // --- RENDERING CLASSICO PER RECENSIONI FILM/TV ---
  return (
    <div className={styles.card}>
      <div className={styles.leftColumn}>
        <Link to={`/${movie.media_type === "tv" ? "tv" : "movie"}/${movie.tmdb_id}`}>
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
      </div>
      <div className={styles.rightColumn}>
        <div className={styles.headerRow}>
          <div className={styles.movieTitleWrapper}>
            <Link
              to={`/${movie.media_type === "tv" ? "tv" : "movie"}/${movie.tmdb_id}`}
              className={styles.movieTitleLink}
            >
              {movie.title}
            </Link>
            {movie.release_date && (
              <span className={styles.releaseYear}>
                {movie.release_date.split("-")[0]}
              </span>
            )}
          </div>
          <div className={styles.userInfoWrapper}>
            <Link to={`/profile/${user._id}`} className={styles.authorLink}>
              {user.username || "Utente"}
            </Link>
            <img
              src={
                user.avatar_url ||
                "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png"
              }
              alt="avatar"
              className={styles.userAvatar}
            />
          </div>
        </div>
        
        <div className={styles.ratingRow}>
          <span className={styles.ratingValue}>{rating}/10</span>
        </div>
        
        {comment_text && <p className={styles.comment}>{renderText(comment_text)}</p>}
        {/* Nuova riga combinata Footer */}
        <div className={styles.footerRow}>
          <div className={styles.timestamp}>{timeAgo(createdAt)}</div>

          {token && (
            <div className={styles.rightActionStack}>
              <button
                onClick={() => handleReaction("love")}
                title="Love"
                disabled={!loggedInUserId}
                className={`${styles.instBtn} ${hasLoved ? styles.instBtnLiked : ""}`}
              >
                {hasLoved ? <FaHeart color="#e50914" /> : <FaRegHeart />}
                <span>{reactionCount}</span>
              </button>
              
              <button onClick={toggleComments} className={styles.instBtn}>
                <FaRegComment />
                <span>{commentCount}</span>
              </button>
            </div>
          )}
        </div>

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
                      <span> {renderText(comment.comment_text)}</span>
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
              <div style={{ position: "relative" }}>
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
                <form onSubmit={handleAddComment} className={styles.commentForm}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={commentText}
                    onChange={handleCommentChange}
                    placeholder="Rispondi... usa @ per taggare"
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReviewCard;
