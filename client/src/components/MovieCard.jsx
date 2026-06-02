import React from "react";
import { Link } from "react-router-dom";
import styles from "./MovieCard.module.css";
import { FiTrash2 } from "react-icons/fi";

const MovieCard = ({ movie, onDelete, showDeleteButton, hideTitle = false, onBeforeNavigate, hideRating = false, forceTmdb = false }) => {
  if (!movie) return null;

  const movieId    = movie.tmdb_id || movie.id;
  const movieTitle = movie.title || "Titolo non disponibile";
  const posterPath = movie.poster_path;
  const isTv       = movie.media_type === "tv";
  const linkPath   = isTv ? `/tv/${movieId}` : `/movie/${movieId}`;
  const ratingText = movie.vote_average ? Number(movie.vote_average).toFixed(1) : null;
  const year       = movie.release_date 
    ? new Date(movie.release_date).getFullYear() 
    : (movie.first_air_date 
        ? new Date(movie.first_air_date).getFullYear() 
        : (movie.release_year || null));

  const handleDeleteClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete) onDelete(movieId);
  };

  return (
    <Link to={linkPath} className={styles.cardLink} data-movie-link onClick={onBeforeNavigate}>
      <div className={styles.card} data-movie-card>

        {/* Delete button */}
        {showDeleteButton && (
          <button onClick={handleDeleteClick} className={styles.deleteButton} title="Rimuovi">
            <FiTrash2 size={12} />
          </button>
        )}

        {/* Poster */}
        <img
          src={posterPath
            ? `https://image.tmdb.org/t/p/w500${posterPath}`
            : "https://placehold.co/300x450/111113/333?text=—"}
          alt={`Locandina di ${movieTitle}`}
          data-movie-img
          loading="lazy"
          decoding="async"
        />

        {/* Rating badge */}
        {(ratingText || year) && !hideRating && (
          <div className={styles.ratingBadge}>
            {ratingText && (
              <>
                <span style={{ color: "#e2c77a" }}>★</span>
                {ratingText}
              </>
            )}
            {year && <span className={`${styles.cardYear} movie-card-year`}>{year}</span>}
          </div>
        )}

        {/* Title overlay */}
        {!hideTitle && (
          <div className={styles.title} data-movie-title>{movieTitle}</div>
        )}

      </div>
    </Link>
  );
};

export default MovieCard;
