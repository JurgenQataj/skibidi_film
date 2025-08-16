import React from "react";
import { Link } from "react-router-dom";
import styles from "./MovieCard.module.css";

const MovieCard = ({ movie }) => {
  const posterBaseUrl = "https://image.tmdb.org/t/p/w200";
  const placeholderPoster =
    "https://via.placeholder.com/200x300.png?text=No+Image";

  if (!movie) {
    return null; // Aggiunge un controllo di sicurezza per evitare crash
  }

  // Logica migliorata per trovare sempre l'ID corretto
  const movieId = movie.tmdb_id || movie.id;
  const movieTitle = movie.title || "Titolo non disponibile";
  const posterPath = movie.poster_path;

  return (
    <Link to={`/movie/${movieId}`} className={styles.cardLink}>
      <div className={styles.card}>
        <img
          src={posterPath ? `${posterBaseUrl}${posterPath}` : placeholderPoster}
          alt={`Locandina di ${movieTitle}`}
        />
        <div className={styles.title}>{movieTitle}</div>
      </div>
    </Link>
  );
};

export default MovieCard;
