import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import styles from "./CollectionPage.module.css";
import MovieCard from "../components/MovieCard";
import { jwtDecode } from "jwt-decode";

function CollectionPage() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userReviewIds, setUserReviewIds] = useState(new Set());
  const [showUnseen, setShowUnseen] = useState(false);

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_URL}/api/movies/collection/${id}`, { headers });
        setCollection(response.data);

        // Fetch delle recensioni dell'utente loggato per il filtro "visti"
        if (token) {
          try {
            const decoded = jwtDecode(token);
            const userId = decoded?.user?.id;
            if (userId) {
              const reviewsRes = await axios.get(`${API_URL}/api/users/${userId}/reviews`);
              const seenIds = new Set(reviewsRes.data.map(r => r.movie.tmdb_id));
              setUserReviewIds(seenIds);
            }
          } catch (e) {
            console.error("Errore fetch user reviews per filtro:", e);
          }
        }
      } catch (err) {
        console.error("Errore nel recupero della saga:", err);
        setError("Impossibile caricare i dati della saga.");
      } finally {
        setLoading(false);
      }
    };

    fetchCollection();
  }, [id]);

  if (loading) return <div className={styles.statusMessage}>Caricamento saga in corso...</div>;
  if (error) return <div className={styles.statusMessage}>{error}</div>;
  if (!collection) return <div className={styles.statusMessage}>Nessun dato trovato per questa saga.</div>;

  const posterBaseUrl = "https://image.tmdb.org/t/p/";

  return (
    <div className={styles.pageContainer}>
      <div 
        className={styles.header}
         style={{
          backgroundImage: `url(${
            collection.backdrop_path
              ? `${posterBaseUrl}w1280${collection.backdrop_path}`
              : ""
          })`,
        }}
      >
        <div className={styles.headerOverlay}>
          <div className={styles.headerContent}>
            <img
              src={
                collection.poster_path
                  ? `${posterBaseUrl}w400${collection.poster_path}`
                  : "https://via.placeholder.com/400x600.png?text=No+Image"
              }
              alt={`Locandina di ${collection.name}`}
              className={styles.poster}
            />
            <div className={styles.details}>
              <h1 className={styles.title}>{collection.name}</h1>
              <p className={styles.overview}>
                {collection.overview || "Nessuna descrizione disponibile per questa saga."}
              </p>
              <div className={styles.stats}>
                <span>{collection.parts?.length || 0} Film</span>
                {userReviewIds.size > 0 && (
                  <label className={styles.unseenToggle}>
                    <input 
                      type="checkbox" 
                      checked={showUnseen} 
                      onChange={(e) => setShowUnseen(e.target.checked)}
                    />
                    <span className={styles.toggleText}>Nascondi i film visti</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.moviesGrid}>
          {(() => {
            const displayedMovies = showUnseen 
              ? collection.parts.filter(m => !userReviewIds.has(m.id))
              : collection.parts;

            return displayedMovies && displayedMovies.length > 0 ? (
              displayedMovies.map((movie) => (
                <div key={movie.id} className={styles.movieWrapper}>
                  <MovieCard movie={{ ...movie, tmdb_id: movie.id }} />
                </div>
              ))
            ) : (
              <p>Nessun film da mostrare coi filtri attuali.</p>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default CollectionPage;
