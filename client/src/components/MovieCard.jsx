import React from 'react';
import { Link } from 'react-router-dom';
import styles from './MovieCard.module.css';

const MovieCard = ({ movie }) => {
  const posterBaseUrl = 'https://image.tmdb.org/t/p/w200';
  const placeholderPoster = 'https://via.placeholder.com/200x300.png?text=No+Image';

  // Usiamo tmdb_id se esiste (dalle nostre recensioni), altrimenti id (dalla ricerca TMDB)
  const movieId = movie.tmdb_id || movie.id;

  return (
    // Avvolgiamo tutto in un Link che porta alla pagina giusta
    <Link to={`/movie/${movieId}`} className={styles.cardLink}>
      <div className={styles.card}>
        <img 
          src={movie.poster_path ? `${posterBaseUrl}${movie.poster_path}` : placeholderPoster} 
          alt={`Locandina di ${movie.title}`} 
        />
        <div className={styles.title}>{movie.title}</div>
      </div>
    </Link>
  );
};

export default MovieCard;