import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
// *** CORREZIONE: Importa il nuovo file di stile ***
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";

function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWatchlist = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.user.id;

      const API_URL = import.meta.env.VITE_API_URL || "";
      const response = await axios.get(
        `${API_URL}/api/watchlist/user/${userId}`
      );
      setWatchlist(response.data);
    } catch (error) {
      console.error("Errore nel caricamento della watchlist:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  if (loading)
    return <p className={styles.statusText}>Caricamento della watchlist...</p>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>La mia Watchlist</h1>
        <p className={styles.description}>
          I film che hai salvato per guardarli più tardi.
        </p>
      </header>
      {/* *** CORREZIONE: Usa la classe "reviewsGrid" per attivare la griglia corretta *** */}
      <div className={styles.reviewsGrid}>
        {watchlist.length > 0 ? (
          watchlist.map((movie) => (
            <MovieCard key={movie.tmdb_id} movie={movie} />
          ))
        ) : (
          <p className={styles.statusText}>La tua watchlist è vuota.</p>
        )}
      </div>
    </div>
  );
}

export default WatchlistPage;
