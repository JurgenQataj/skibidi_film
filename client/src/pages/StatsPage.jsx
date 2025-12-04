import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./StatsPage.module.css";
import MovieCard from "../components/MovieCard";

function StatsPage() {
  const { userId } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/${userId}/advanced-stats`);
        setStats(res.data);
      } catch (error) {
        console.error("Errore stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId, API_URL]);

  if (loading) return <div className={styles.loading}>Caricamento Statistiche...</div>;
  if (!stats) return <div className={styles.error}>Impossibile caricare le statistiche.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{stats.username}'s Stats</h1>

      <div className={styles.statsGrid}>
        {/* Sezione 1: Top 10 Film 2025 */}
        <section className={styles.statSection}>
          <h2>Top 10 Film 2025</h2>
          <div className={styles.movieList}>
            {stats.top2025.length > 0 ? (
              stats.top2025.map((review) => (
                <div key={review._id} className={styles.rankedItem}>
                  <span className={styles.ratingBadge}>{review.rating}</span>
                  <MovieCard movie={review.movie} />
                </div>
              ))
            ) : (
              <p className={styles.emptyMsg}>Nessun film del 2025 recensito.</p>
            )}
          </div>
        </section>

        {/* Sezione 2: Top 10 All Time */}
        <section className={styles.statSection}>
          <h2>Top 10 All Time</h2>
          <div className={styles.movieList}>
            {stats.topAllTime.length > 0 ? (
              stats.topAllTime.map((review) => (
                <div key={review._id} className={styles.rankedItem}>
                  <span className={styles.ratingBadge}>{review.rating}</span>
                  <MovieCard movie={review.movie} />
                </div>
              ))
            ) : (
              <p className={styles.emptyMsg}>Nessuna recensione trovata.</p>
            )}
          </div>
        </section>

        {/* Sezione 3: Attori più visti */}
        <section className={styles.statSection}>
          <h2>Top 10 Attori più visti</h2>
          <ul className={styles.textList}>
            {stats.topActors.length > 0 ? (
              stats.topActors.map((actor, idx) => (
                <li key={idx} className={styles.textItem}>
                  <span className={styles.rank}>#{idx + 1}</span>
                  <span className={styles.name}>{actor.name}</span>
                  <span className={styles.count}>{actor.count} film</span>
                </li>
              ))
            ) : (
              <p className={styles.emptyMsg}>Dati attori non disponibili.</p>
            )}
          </ul>
        </section>

        {/* Sezione 4: Registi più visti */}
        <section className={styles.statSection}>
          <h2>Top 10 Registi più visti</h2>
          <ul className={styles.textList}>
            {stats.topDirectors.length > 0 ? (
              stats.topDirectors.map((dir, idx) => (
                <li key={idx} className={styles.textItem}>
                  <span className={styles.rank}>#{idx + 1}</span>
                  <span className={styles.name}>{dir.name}</span>
                  <span className={styles.count}>{dir.count} film</span>
                </li>
              ))
            ) : (
              <p className={styles.emptyMsg}>Dati registi non disponibili.</p>
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}

export default StatsPage;