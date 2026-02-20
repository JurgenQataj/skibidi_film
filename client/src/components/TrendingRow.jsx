import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./TrendingRow.module.css";
import MovieCard from "./MovieCard";

const TrendingRow = () => {
  const [timeWindow, setTimeWindow] = useState("day"); // 'day' o 'week'
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const response = await axios.get(`${API_URL}/api/movies/trending?timeWindow=${timeWindow}`);
        setMovies(response.data || []);
      } catch (err) {
        console.error("Errore caricamento tendenze:", err);
        setError("Impossibile caricare i film in tendenza.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [timeWindow]);

  return (
    <div className={styles.trendingRowContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>In Tendenza</h2>
        <div className={styles.toggleContainer}>
          <button
            className={`${styles.toggleButton} ${timeWindow === "day" ? styles.active : ""}`}
            onClick={() => setTimeWindow("day")}
          >
            Oggi
          </button>
          <button
            className={`${styles.toggleButton} ${timeWindow === "week" ? styles.active : ""}`}
            onClick={() => setTimeWindow("week")}
          >
            Questa settimana
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loader}>Caricamento...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.scrollContainer}>
          {movies.map((movie) => (
            <div key={movie.id} className={styles.cardWrapper}>
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingRow;
