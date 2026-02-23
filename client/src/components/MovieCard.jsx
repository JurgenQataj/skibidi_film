import React from "react";
import { Link } from "react-router-dom";
import styles from "./MovieCard.module.css";

const MovieCard = ({ movie, onDelete, showDeleteButton }) => {
  const posterBaseUrl = "https://image.tmdb.org/t/p/w500";
  const placeholderPoster =
    "https://via.placeholder.com/200x300.png?text=No+Image";

  if (!movie) {
    return null;
  }

  const movieId = movie.tmdb_id || movie.id;
  const movieTitle = movie.title || "Titolo non disponibile";
  const posterPath = movie.poster_path;

  const handleDeleteClick = (e) => {
    // Previene la navigazione quando si clicca sulla X
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) {
      onDelete(movieId);
    }
  };

  const isTv = movie.media_type === "tv";
  const linkPath = isTv ? `/tv/${movieId}` : `/movie/${movieId}`;
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;

  return (
    // L'intera card rimane un link
    <Link to={linkPath} className={styles.cardLink} data-movie-link>
      <div className={styles.card} data-movie-card>
        {/* Il pulsante di eliminazione, ora posizionato correttamente */}
        {showDeleteButton && (
          <button onClick={handleDeleteClick} className={styles.deleteButton}>
            ×
          </button>
        )}
        <img
          src={posterPath ? `${posterBaseUrl}${posterPath}` : placeholderPoster}
          alt={`Locandina di ${movieTitle}`}
          data-movie-img
        />
        {rating && parseFloat(rating) > 0 && (
          <div className={styles.ratingBadge}>
            <span style={{color: '#ffd700'}}>★</span> {rating}
          </div>
        )}
        <div className={styles.title} data-movie-title>{movieTitle}</div>
      </div>
    </Link>
  );
};

// *** AGGIUNTO L'EXPORT DEFAULT CHE MANCAVA! ***
export default MovieCard;
