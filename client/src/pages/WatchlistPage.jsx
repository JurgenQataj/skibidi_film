import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";

function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "";

  const fetchWatchlist = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.user.id;
      const response = await axios.get(
        `${API_URL}/api/watchlist/user/${userId}`
      );
      setWatchlist(response.data);
    } catch (error) {
      console.error("Errore nel caricamento della watchlist:", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  // *** CORREZIONE 1: Funzione per rimuovere un film dalla watchlist ***
  const handleRemoveFromWatchlist = async (tmdbId) => {
    if (
      !window.confirm(
        "Sei sicuro di voler rimuovere questo film dalla watchlist?"
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/watchlist/${tmdbId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Aggiorna lo stato per rimuovere il film senza ricaricare la pagina
      setWatchlist((prev) => prev.filter((movie) => movie.tmdb_id !== tmdbId));
    } catch (error) {
      alert("Errore durante la rimozione del film.");
    }
  };

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
      <div className={styles.reviewsGrid}>
        {watchlist.length > 0 ? (
          watchlist.map((movie) => (
            // *** CORREZIONE 2: Passa la funzione e la prop per mostrare il pulsante ***
            <MovieCard
              key={movie.tmdb_id}
              movie={movie}
              showDeleteButton={true}
              onDelete={handleRemoveFromWatchlist}
            />
          ))
        ) : (
          <p className={styles.statusText}>La tua watchlist è vuota.</p>
        )}
      </div>
    </div>
  );
}

export default WatchlistPage;
