import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./MovieDetailPage.module.css";
import AddReviewForm from "../components/AddReviewForm";
import MovieCard from "../components/MovieCard";
import EditReviewModal from "../components/EditReviewModal";
import { SkeletonMovieCard } from "../components/Skeleton";

function MovieDetailPage() {
  const { tmdbId } = useParams();
  const navigate = useNavigate();

  const [movie, setMovie] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
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
  const [editingReview, setEditingReview] = useState(null); // [NEW] Stato per la recensione in modifica

  const API_URL = import.meta.env.VITE_API_URL || "";

  const fetchData = useCallback(async () => {
    if (!tmdbId || tmdbId === "undefined") {
      navigate("/");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const userId = token ? jwtDecode(token).user.id : null;
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
      const movieData = results[0].data;

      setMovie(movieData);

      if (movieData && Array.isArray(movieData.recommendations)) {
        setRecommendations(movieData.recommendations);
      } else {
        setRecommendations([]);
      }

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
  }, [tmdbId, API_URL, navigate]);

  useEffect(() => {
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
          `${API_URL}/api/comments/review/${reviewId}`
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
    if (!token) return;

    try {
      const response = await axios.post(
        `${API_URL}/api/comments/review/${reviewId}`,
        { comment_text: commentText.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCommentText("");
      setActiveComments({ reviewId, comments: response.data || [] });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Errore");
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Sei sicuro di voler eliminare questo commento?"))
      return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(
        `${API_URL}/api/comments/review/${activeComments.reviewId}/comment/${commentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const response = await axios.get(
        `${API_URL}/api/comments/review/${activeComments.reviewId}`
      );
      setActiveComments({
        reviewId: activeComments.reviewId,
        comments: response.data || [],
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Errore");
    }
  };

  const customLists = userLists.filter((list) => list.id !== "watchlist");

  if (loading) return (
    <div style={{ maxWidth: "900px", margin: "60px auto", padding: "0 30px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", gap: "15px" }}>
      {Array.from({ length: 6 }).map((_, i) => <SkeletonMovieCard key={i} />)}
    </div>
  );
  if (error) return <p className={styles.loading}>{error}</p>;
  if (!movie) return <p className={styles.loading}>Film non trovato.</p>;

  const posterBaseUrl = "https://image.tmdb.org/t/p/";
  const formatCurrency = (num) =>
    num > 0 ? `${num.toLocaleString("it-IT")} $` : "N/A";

  const formatRuntime = (runtime) => {
    if (!runtime || runtime === 0) return "N/A";
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  // Formatta la data in italiano
  const formatReleaseDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const options = { day: "numeric", month: "long", year: "numeric" };
    return date.toLocaleDateString("it-IT", options);
  };

  // Formatta i generi (max 3)
  const formatGenres = (genres) => {
    if (!genres || genres.length === 0) return "N/A";
    return genres
      .slice(0, 3)
      .map((genre) => genre.name)
      .join(", ");
  };

  // Formatta il rating TMDB
  const formatRating = (rating) => {
    if (!rating || rating === 0) return "N/A";
    return rating.toFixed(1);
  };

  // Trova il trailer principale
  const getMainTrailer = (videos) => {
    if (!videos || videos.length === 0) return null;
    // Cerca prima "Official Trailer", poi "Trailer", poi il primo video
    return (
      videos.find(
        (video) =>
          video.type === "Trailer" &&
          video.site === "YouTube" &&
          (video.name.includes("Official") || video.name.includes("Trailer"))
      ) ||
      videos.find(
        (video) => video.type === "Trailer" && video.site === "YouTube"
      ) ||
      videos[0]
    );
  };

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
                  ? `${posterBaseUrl}w500${movie.poster_path}`
                  : "https://via.placeholder.com/500x750.png?text=No+Image"
              }
              alt={`Locandina di ${movie.title}`}
              className={styles.poster}
            />
            <div className={styles.details}>
              <h1 className={styles.title}>
                {movie.title}{" "}
                {movie.release_date
                  ? `(${new Date(movie.release_date).getFullYear()})`
                  : ""}
              </h1>
              <p className={styles.tagline}>{movie.tagline}</p>

              <div className={styles.director}>
                <strong>Regia:</strong>{" "}
                {/* LINK CLICCABILE PER REGISTA */}
                {movie.director?.name ? (
                  <Link 
                    to={`/person/${encodeURIComponent(movie.director.name)}`} 
                    className={styles.personLink}
                  >
                    {movie.director.name}
                  </Link>
                ) : (
                  <span>Non disponibile</span>
                )}
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

        {/* FORM RECENSIONE SUBITO DOPO LA TRAMA */}
        {loggedInUserId && !hasUserReviewed && (
          <div className={styles.reviewFormSection}>
            <AddReviewForm tmdbId={tmdbId} onReviewAdded={fetchData} />
          </div>
        )}

        {/* 🆕 SEZIONE INFO AGGIORNATA - Layout 2x5 */}
        <div className={styles.infoSection}>
          <div className={styles.infoBox}>
            <h4>Regia</h4>
             {/* LINK CLICCABILE PER REGISTA NEI BOX */}
            <p>
               {movie.director?.name ? (
                  <Link 
                    to={`/person/${encodeURIComponent(movie.director.name)}`} 
                    className={styles.personLink}
                  >
                    {movie.director.name}
                  </Link>
                ) : (
                  "Non disponibile"
                )}
            </p>
          </div>
          <div className={styles.infoBox}>
            <h4>Durata</h4>
            <p>{formatRuntime(movie.runtime)}</p>
          </div>
          <div className={styles.infoBox}>
            <h4>Data Uscita</h4>
            <p>{formatReleaseDate(movie.release_date)}</p>
          </div>
          <div className={styles.infoBox}>
            <h4>Rating TMDB</h4>
            <p>{formatRating(movie.vote_average)}</p>
          </div>
          <div className={styles.infoBox}>
            <h4>Genere</h4>
            <p>{formatGenres(movie.genres)}</p>
          </div>
          <div className={styles.infoBox}>
            <h4>Produttore</h4>
            <p>{movie.producer?.name || "Non disponibile"}</p>
          </div>
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
            <p>{movie.original_language?.toUpperCase()}</p>
          </div>
          {movie.collection && (
            <div className={styles.infoBox}>
              <h4>Saga</h4>
              <p>
                <Link 
                  to={`/collection/${movie.collection.id}`} 
                  className={styles.personLink}
                >
                  {movie.collection.name.replace(" - Collection", "")}
                </Link>
              </p>
            </div>
          )}
          {movie.watch_providers && movie.watch_providers.flatrate && movie.watch_providers.flatrate.length > 0 && (
             <div className={styles.infoBox}>
               <h4>Dove Vederlo</h4>
               <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "5px" }}>
                 {movie.watch_providers.flatrate.map((provider) => {
                   const logoRender = (
                     <img 
                        key={provider.provider_id}
                        src={`https://image.tmdb.org/t/p/original${provider.logo_path}`} 
                        alt={provider.provider_name}
                        title={provider.provider_name}
                        style={{ width: "32px", height: "32px", borderRadius: "8px", cursor: movie.watch_providers.link ? "pointer" : "default" }}
                     />
                   );
                   return movie.watch_providers.link ? (
                     <a key={provider.provider_id} href={movie.watch_providers.link} target="_blank" rel="noopener noreferrer">
                       {logoRender}
                     </a>
                   ) : (
                     logoRender
                   );
                 })}
               </div>
             </div>
          )}
          {getMainTrailer(movie.videos) && (
            <div className={styles.infoBox}>
              <h4>Trailer</h4>
              <p>
                <a
                  href={`https://youtube.com/watch?v=${
                    getMainTrailer(movie.videos).key
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.trailerLink}
                >
                  ▶️ YouTube
                </a>
              </p>
            </div>
          )}
        </div>

        <div className={styles.castSection}>
          <h2>Cast Principale</h2>
          <div className={styles.castGrid}>
            {movie.cast?.map((actor) => (
              <div key={actor.id} className={styles.actorCard}>
                <img
                  src={
                    actor.profile_path
                      ? `${posterBaseUrl}w342${actor.profile_path}`
                      : "https://via.placeholder.com/342x513.png?text=No+Image"
                  }
                  alt={actor.name}
                />
                {/* LINK CLICCABILE PER ATTORE */}
                <Link 
                    to={`/person/${encodeURIComponent(actor.name)}`} 
                    className={styles.personLink}
                >
                    <strong>{actor.name}</strong>
                </Link>
                <span>{actor.character}</span>
              </div>
            ))}
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className={styles.castSection}>
            <h2>Film Consigliati</h2>
            <div className={styles.recommendationsGrid}>
              {recommendations.map((rec) => (
                <div key={rec.id} className={styles.movieCardWrapper}>
                  <MovieCard movie={rec} />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={styles.reviewsSection}>
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
                      <div className={styles.manageButtons} style={{display: "flex", gap: "10px", marginTop: "5px"}}>
                         <button
                          onClick={() => setEditingReview(review)}
                          className={styles.editButton}
                          style={{
                              background: "none", border: "1px solid #aaa", color: "#ccc",
                              padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem"
                          }}
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className={styles.deleteButton}
                        >
                          Elimina
                        </button>
                      </div>
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
                          {loggedInUserId === comment.user._id && (
                            <button
                              onClick={() => handleDeleteComment(comment._id)}
                              className={styles.deleteCommentButton}
                            >
                              ×
                            </button>
                          )}
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
      {/* MODALE DI MODIFICA */}
      {editingReview && (
        <EditReviewModal
          review={editingReview}
          onClose={() => setEditingReview(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}

export default MovieDetailPage;