import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./MovieDetailPage.module.css";
import AddReviewForm from "../components/AddReviewForm";

function MovieDetailPage() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tmdbId || tmdbId === "undefined") {
      console.error("ID del film non valido, reindirizzamento alla home.");
      navigate("/");
    }
  }, [tmdbId, navigate]);

  const [movie, setMovie] = useState(null);
  const [skibidiData, setSkibidiData] = useState({
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [userLists, setUserLists] = useState([]);
  const [showLists, setShowLists] = useState(false);
  const [activeComments, setActiveComments] = useState({
    reviewId: null,
    comments: [],
  });
  const [commentText, setCommentText] = useState("");

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchData = useCallback(async () => {
    if (!tmdbId || tmdbId === "undefined") return;
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let userId = token ? jwtDecode(token).user.id : null;
      setLoggedInUserId(userId);
      const moviePromise = axios.get(`${API_URL}/api/movies/${tmdbId}`);
      const reviewsPromise = axios.get(
        `${API_URL}/api/reviews/movie/${tmdbId}`
      );
      const promises = [moviePromise, reviewsPromise];
      if (userId) {
        promises.push(
          axios.get(`${API_URL}/api/reviews/status/${tmdbId}`, { headers })
        );
        promises.push(
          axios.get(`${API_URL}/api/watchlist/status/${tmdbId}`, { headers })
        );
        promises.push(
          axios.get(`${API_URL}/api/users/${userId}/lists`, { headers })
        );
      }
      const results = await Promise.all(promises);
      setMovie(results[0].data);
      setSkibidiData(results[1].data);
      if (userId && results.length > 2) {
        setHasUserReviewed(results[2].data.hasReviewed);
        setIsInWatchlist(results[3].data.isInWatchlist);
        setUserLists(results[4].data);
      }
    } catch (err) {
      console.error("Errore nel caricamento dati:", err);
      setError("Impossibile caricare i dati del film.");
    } finally {
      setLoading(false);
    }
  }, [tmdbId, API_URL]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Sei sicuro di voler eliminare la tua recensione?"))
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/reviews/${reviewId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (error) {
      alert("Errore durante l'eliminazione della recensione.");
    }
  };

  const handleWatchlistToggle = async () => {
    const token = localStorage.getItem("token");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (isInWatchlist) {
        await axios.delete(`${API_URL}/api/watchlist/${tmdbId}`, config);
      } else {
        await axios.post(`${API_URL}/api/watchlist`, { tmdbId }, config);
      }
      setIsInWatchlist(!isInWatchlist);
    } catch (error) {
      alert("Errore nell'aggiornamento della watchlist.");
    }
  };

  const handleAddToList = async (listId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_URL}/api/lists/${listId}/movies`,
        { tmdbId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`Film aggiunto alla lista!`);
      setShowLists(false);
    } catch (error) {
      alert(
        error.response?.data?.message || "Errore durante l'aggiunta alla lista."
      );
    }
  };

  const handleReaction = async (reviewId, reactionType) => {
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_URL}/api/reactions/reviews/${reviewId}`,
        { reaction_type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (error) {
      alert("Errore durante l'invio della reazione.");
    }
  };

  const toggleComments = async (reviewId) => {
    if (activeComments.reviewId === reviewId) {
      setActiveComments({ reviewId: null, comments: [] });
    } else {
      try {
        const response = await axios.get(
          `${API_URL}/api/comments/reviews/${reviewId}`
        );
        setActiveComments({ reviewId, comments: response.data });
      } catch (error) {
        console.error("Errore caricamento commenti:", error);
      }
    }
  };

  const handleAddComment = async (e, reviewId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${API_URL}/api/comments/reviews/${reviewId}`,
        { comment_text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      const response = await axios.get(
        `${API_URL}/api/comments/reviews/${reviewId}`
      );
      setActiveComments({ reviewId, comments: response.data });
      fetchData();
    } catch (error) {
      alert("Errore nell'invio del commento.");
    }
  };

  const customLists = userLists.filter((list) => list.id !== "watchlist");

  if (loading) return <p className={styles.loading}>Caricamento...</p>;
  if (error) return <p className={styles.loading}>{error}</p>;
  if (!movie) return <p className={styles.loading}>Film non trovato.</p>;

  const posterBaseUrl = "https://image.tmdb.org/t/p/";
  const formatCurrency = (num) =>
    num > 0 ? `${num.toLocaleString("it-IT")} $` : "N/A";

  return (
    <div className={styles.pageContainer}>
      <div
        className={styles.header}
        style={{
          backgroundImage: `url(${posterBaseUrl}w1280${movie.backdrop_path})`,
        }}
      >
        <div className={styles.headerOverlay}>
          <div className={styles.headerContent}>
            <img
              src={
                movie.poster_path
                  ? `${posterBaseUrl}w400${movie.poster_path}`
                  : "https://via.placeholder.com/400x600.png?text=No+Image"
              }
              alt={`Locandina di ${movie.title}`}
              className={styles.poster}
            />
            <div className={styles.details}>
              <h1 className={styles.title}>
                {movie.title} ({new Date(movie.release_date).getFullYear()})
              </h1>
              <p className={styles.tagline}>{movie.tagline}</p>
              <div className={styles.director}>
                <strong>Regista:</strong>{" "}
                {movie.director?.name || "Non disponibile"}
              </div>
              {loggedInUserId && (
                <div className={styles.actions}>
                  <button
                    onClick={handleWatchlistToggle}
                    className={styles.actionButton}
                  >
                    {isInWatchlist ? "✔ Nella Watchlist" : "+ Watchlist"}
                  </button>
                  <button
                    onClick={() => setShowLists(!showLists)}
                    className={styles.actionButton}
                  >
                    Aggiungi a Lista
                  </button>
                </div>
              )}
              {showLists && (
                <div className={styles.listsDropdown}>
                  {customLists.length > 0 ? (
                    customLists.map((list) => (
                      <button
                        key={list._id}
                        onClick={() => handleAddToList(list._id)}
                        className={styles.listButton}
                      >
                        {list.title}
                      </button>
                    ))
                  ) : (
                    <p>Non hai ancora creato liste.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.overviewSection}>
          <h3>Trama</h3>
          <p className={styles.overview}>{movie.overview}</p>
        </div>
        <div className={styles.infoSection}>
          <div className={styles.infoBox}>
            <h4>Costo</h4>
            <p>{formatCurrency(movie.budget)}</p>
          </div>
          <div className={styles.infoBox}>
            <h4>Botteghino</h4>
            <p>{formatCurrency(movie.revenue)}</p>
          </div>
          <div className={styles.infoBox}>
            <h4>Lingua</h4>
            <p>{movie.original_language.toUpperCase()}</p>
          </div>
        </div>
        <div className={styles.castSection}>
          <h2>Cast Principale</h2>
          <div className={styles.castGrid}>
            {movie.cast.map((actor) => (
              <div key={actor.id} className={styles.actorCard}>
                <img
                  src={
                    actor.profile_path
                      ? `${posterBaseUrl}w185${actor.profile_path}`
                      : "https://via.placeholder.com/185x278.png?text=No+Image"
                  }
                  alt={actor.name}
                />
                <strong>{actor.name}</strong>
                <span>{actor.character}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.reviewsSection}>
          {loggedInUserId && !hasUserReviewed && (
            <AddReviewForm tmdbId={tmdbId} onReviewAdded={fetchData} />
          )}
          {loggedInUserId && hasUserReviewed && (
            <div className={styles.alreadyReviewedMessage}>
              <h3>Hai già recensito questo film</h3>
            </div>
          )}
          <h2 className={styles.reviewsTitle}>
            Recensioni della Community
            <span className={styles.reviewStats}>
              {skibidiData.averageRating} ★ ({skibidiData.reviewCount} voti)
            </span>
          </h2>
          <div className={styles.reviewsList}>
            {skibidiData.reviews?.map((review) => (
              <div key={review.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <Link
                    to={`/profile/${review.user_id}`}
                    className={styles.authorLink}
                  >
                    <strong className={styles.reviewAuthor}>
                      {review.username}
                    </strong>
                  </Link>
                  <div>
                    <span className={styles.reviewRating}>
                      {review.rating}/10
                    </span>
                    {loggedInUserId === review.user_id && (
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className={styles.deleteButton}
                      >
                        Elimina
                      </button>
                    )}
                  </div>
                </div>
                <p className={styles.reviewComment}>{review.comment_text}</p>
                <div className={styles.reviewActions}>
                  <div className={styles.reactions}>
                    <button
                      onClick={() => handleReaction(review.id, "love")}
                      title="Love"
                    >
                      ❤️
                    </button>
                    <span>{review.reactions?.love || 0}</span>
                  </div>
                  <button
                    onClick={() => toggleComments(review.id)}
                    className={styles.commentButton}
                  >
                    {activeComments.reviewId === review.id
                      ? "Chiudi"
                      : "Commenti"}{" "}
                    ({review.comment_count || 0})
                  </button>
                </div>
                {activeComments.reviewId === review.id && (
                  <div className={styles.commentsSection}>
                    {activeComments.comments
                      .filter((c) => c.user)
                      .map((comment) => (
                        <div key={comment._id} className={styles.commentItem}>
                          <Link
                            to={`/profile/${comment.user._id}`}
                            className={styles.authorLink}
                          >
                            <strong>{comment.user.username}:</strong>
                          </Link>
                          <span> {comment.comment_text}</span>
                        </div>
                      ))}
                    <form
                      className={styles.commentForm}
                      onSubmit={(e) => handleAddComment(e, review.id)}
                    >
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Scrivi una risposta..."
                      />
                      <button type="submit">Invia</button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MovieDetailPage;
