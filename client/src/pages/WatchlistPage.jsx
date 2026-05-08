import React, { useState, useEffect, useLayoutEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard, SkeletonWithLogo } from "../components/Skeleton";
import SkibidiRoulette from "../components/SkibidiRoulette";

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

  // Ripristina la posizione dello scroll PRIMA che il browser dipinga (nessun flash visivo)
  useLayoutEffect(() => {
    if (!loading && watchlist.length > 0) {
      const savedPosition = sessionStorage.getItem("watchlistScrollPos");
      if (savedPosition) {
        window.scrollTo({ top: parseInt(savedPosition, 10), behavior: "instant" });
        sessionStorage.removeItem("watchlistScrollPos");
      }
    }
  }, [loading, watchlist.length]);

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
      const movieToRemove = watchlist.find(m => m.tmdb_id === tmdbId);
      const mediaType = movieToRemove?.media_type || "movie";
      
      await axios.delete(`${API_URL}/api/watchlist/${tmdbId}?mediaType=${mediaType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Aggiorna lo stato per rimuovere il film senza ricaricare la pagina
      setWatchlist((prev) => prev.filter((movie) => movie.tmdb_id !== tmdbId));
    } catch (error) {
      alert("Errore durante la rimozione del film.");
    }
  };

  if (loading) return <SkeletonWithLogo />;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>La mia Watchlist</h1>
      </header>
      <div className={styles.reviewsGrid}>
        {watchlist.length > 0 ? (
          watchlist.map((movie) => (
            <div
              key={movie.tmdb_id}
              className={styles.cardWrapper}
            >
              <MovieCard
                movie={movie}
                showDeleteButton={true}
                onDelete={handleRemoveFromWatchlist}
                onBeforeNavigate={() => sessionStorage.setItem("watchlistScrollPos", window.scrollY)}
              />
            </div>
          ))
        ) : (
          <p className={styles.statusText}>La tua watchlist è vuota.</p>
        )}
      </div>

      <SkibidiRoulette watchlist={watchlist} />
    </div>
  );
}

export default WatchlistPage;
