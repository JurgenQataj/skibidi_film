import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard } from "../components/Skeleton";

function WatchlistPage() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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

  if (loading) return (
    <div className={styles.pageContainer}>
      <div className={styles.reviewsGrid}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonMovieCard key={i} />)}
      </div>
    </div>
  );

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
            <div
              key={movie.tmdb_id}
              className={styles.cardWrapper}
              onClick={(e) => {
                // Naviga solo se NON si clicca su un pulsante (es. elimina)
                if (!e.target.closest("button")) {
                  navigate(`/movie/${movie.tmdb_id}`);
                }
              }}
            >
              <MovieCard
                movie={movie}
                showDeleteButton={true}
                onDelete={handleRemoveFromWatchlist}
              />
            </div>
          ))
        ) : (
          <p className={styles.statusText}>La tua watchlist è vuota.</p>
        )}
      </div>
    </div>
  );
}

export default WatchlistPage;
