import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import styles from "./CollectionPage.module.css";
import MovieCard from "../components/MovieCard";

function CollectionPage() {
  const { id } = useParams();
  const [collection, setCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCollection = async () => {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axios.get(`${API_URL}/api/movies/collection/${id}`, { headers });
        setCollection(response.data);
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
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <h2>Film della Saga (Ordine Cronologico)</h2>
        <div className={styles.moviesGrid}>
          {collection.parts && collection.parts.length > 0 ? (
            collection.parts.map((movie) => (
              <div key={movie.id} className={styles.movieWrapper}>
                <MovieCard movie={{ ...movie, tmdb_id: movie.id }} />
              </div>
            ))
          ) : (
            <p>Nessun film trovato in questa collezione.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CollectionPage;
