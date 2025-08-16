import React from "react";
import { Link } from "react-router-dom";
import styles from "./MovieCard.module.css";

const MovieCard = ({ movie }) => {
  const posterBaseUrl = "https://image.tmdb.org/t/p/w200";
  const placeholderPoster =
    "https://via.placeholder.com/200x300.png?text=No+Image";

  // Logica di sicurezza: se 'movie' non esiste, non mostrare nulla
  if (!movie) {
    return null;
  }

  const movieId = movie.tmdb_id || movie.id;

  if (!movieId) {
    return (
      <div className={styles.card}>
        <img src={placeholderPoster} alt="Film non disponibile" />
        <div className={styles.title}>Dati non disponibili</div>
      </div>
    );
  }

  return (
    <Link to={`/movie/${movieId}`} className={styles.cardLink}>
      <div className={styles.card}>
        <img
          src={
            movie.poster_path
              ? `${posterBaseUrl}${movie.poster_path}`
              : placeholderPoster
          }
          alt={`Locandina di ${movie.title}`}
        />
        <div className={styles.title}>{movie.title}</div>
      </div>
    </Link>
  );
};
export default MovieCard;
