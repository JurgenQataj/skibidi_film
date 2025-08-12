import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./MovieDetailPage.module.css";
import AddReviewForm from "../components/AddReviewForm";

function MovieDetailPage() {
  const { tmdbId } = useParams();

  // Stati principali
  const [movie, setMovie] = useState(null);
  const [skibidiData, setSkibidiData] = useState({
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Stati legati all'utente loggato
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [userLists, setUserLists] = useState([]);

  // Stati per l'interfaccia
  const [showLists, setShowLists] = useState(false);
  const [activeComments, setActiveComments] = useState({
    reviewId: null,
    comments: [],
  });
  const [commentText, setCommentText] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let userId = token ? jwtDecode(token).user.id : null;
      setLoggedInUserId(userId);

      const moviePromise = axios.get(
        `http://localhost:5000/api/movies/${tmdbId}`
      );
      const reviewsPromise = axios
        .get(`http://localhost:5000/api/reviews/movie/${tmdbId}`)
        .catch(() => ({
          data: { reviews: [], averageRating: 0, reviewCount: 0 },
        }));

      const promises = [moviePromise, reviewsPromise];
      if (userId) {
        promises.push(
          axios.get(`http://localhost:5000/api/reviews/status/${tmdbId}`, {
            headers,
          })
        );
        promises.push(
          axios.get(`http://localhost:5000/api/watchlist/status/${tmdbId}`, {
            headers,
          })
        );
        promises.push(
          axios.get(`http://localhost:5000/api/users/${userId}/lists`, {
            headers,
          })
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
      setError("Impossibile caricare i dati del film. Riprova più tardi.");
    } finally {
      setLoading(false);
    }
  }, [tmdbId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteReview = async (reviewId) => {
    if (window.confirm("Sei sicuro di voler eliminare questa recensione?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`http://localhost:5000/api/reviews/${reviewId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchData();
      } catch (err) {
        alert(err.response?.data?.message || "Errore");
      }
    }
  };

  const handleWatchlistToggle = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Devi essere loggato per usare la watchlist.");
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      if (isInWatchlist) {
        await axios.delete(
          `http://localhost:5000/api/watchlist/${tmdbId}`,
          config
        );
      } else {
        await axios.post(
          "http://localhost:5000/api/watchlist",
          { tmdbId },
          config
        );
      }
      setIsInWatchlist(!isInWatchlist);
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const handleAddToList = async (listId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://localhost:5000/api/lists/${listId}/movies`,
        { tmdbId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("Film aggiunto alla lista!");
      setShowLists(false);
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const handleReaction = async (reviewId, reactionType) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Devi essere loggato per reagire.");
      await axios.post(
        `http://localhost:5000/api/reactions/reviews/${reviewId}`,
        { reaction_type: reactionType },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };

  const toggleComments = async (reviewId) => {
    if (activeComments.reviewId === reviewId) {
      setActiveComments({ reviewId: null, comments: [] });
      return;
    }
    try {
      const response = await axios.get(
        `http://localhost:5000/api/comments/reviews/${reviewId}`
      );
      setActiveComments({ reviewId, comments: response.data });
    } catch (err) {
      console.error("Errore caricamento commenti:", err);
    }
  };

  const handleAddComment = async (reviewId) => {
    if (!commentText.trim()) return;
    try {
      const token = localStorage.getItem("token");
      if (!token) return alert("Devi essere loggato per commentare.");
      await axios.post(
        `http://localhost:5000/api/comments/reviews/${reviewId}`,
        { comment_text: commentText },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      const response = await axios.get(
        `http://localhost:5000/api/comments/reviews/${reviewId}`
      );
      setActiveComments({ reviewId, comments: response.data });
    } catch (err) {
      alert(err.response?.data?.message || "Errore");
    }
  };
  const customLists = userLists.filter((list) => list.id !== "watchlist");

  if (loading) return <p className={styles.loading}>Caricamento...</p>;
  if (error) return <p className={styles.loading}>{error}</p>;
  if (!movie) return <p className={styles.loading}>Film non trovato.</p>;

  const posterBaseUrl = "https://image.tmdb.org/t/p/";

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
              <h3>Trama</h3>
              <p className={styles.overview}>{movie.overview}</p>
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
                  {userLists.length > 0 ? (
                    userLists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => handleAddToList(list.id)}
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

      <div className={styles.infoSection}>
        <div className={styles.infoBox}>
          <h4>Costo</h4>
          <p>
            {movie.budget > 0
              ? `${movie.budget.toLocaleString("it-IT")} $`
              : "N/A"}
          </p>
        </div>
        <div className={styles.infoBox}>
          <h4>Botteghino</h4>
          <p>
            {movie.revenue > 0
              ? `${movie.revenue.toLocaleString("it-IT")} $`
              : "N/A"}
          </p>
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
          Recensioni della Community ({skibidiData.reviewCount || 0})
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
                  {activeComments.comments.map((comment) => (
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
                  <form
                    className={styles.commentForm}
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddComment(review.id);
                    }}
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
  );
}

export default MovieDetailPage;
