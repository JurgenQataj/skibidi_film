import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./StatsPage.module.css";
import MovieCard from "../components/MovieCard";

function StatsPage() {
  const { userId } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Imposta l'anno corrente come predefinito
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Genera una lista di anni (dal corrente indietro fino al 1900)
  const years = Array.from(new Array(currentYear - 1900 + 1), (val, index) => currentYear - index);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true); // Mostra caricamento quando cambia l'anno
      try {
        // Passiamo l'anno selezionato come parametro
        const res = await axios.get(`${API_URL}/api/users/${userId}/advanced-stats?year=${selectedYear}`);
        setStats(res.data);
      } catch (error) {
        console.error("Errore stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId, API_URL, selectedYear]); // Ricarica se cambia selectedYear

  if (loading) return <div className={styles.loading}>Caricamento Statistiche...</div>;
  if (!stats) return <div className={styles.error}>Impossibile caricare le statistiche.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{stats.username}'s Stats</h1>

      <div className={styles.statsGrid}>
        {/* Sezione 1: Top 10 Film per Anno Selezionabile */}
        <section className={styles.statSection}>
          <div className={styles.sectionHeader}>
            <h2>Top 10 Film {selectedYear}</h2>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={styles.yearSelect}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.movieList}>
            {stats.topYear && stats.topYear.length > 0 ? (
              stats.topYear.map((review) => (
                <div key={review._id} className={styles.rankedItem}>
                  <span className={styles.ratingBadge}>{review.rating}</span>
                  <MovieCard movie={review.movie} />
                </div>
              ))
            ) : (
              <p className={styles.emptyMsg}>Nessun film del {selectedYear} recensito.</p>
            )}
          </div>
        </section>

        {/* Sezione 2: Top 10 All Time */}
        <section className={styles.statSection}>
          <h2>Top 10 All Time</h2>
          <div className={styles.movieList}>
            {stats.topAllTime && stats.topAllTime.length > 0 ? (
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
            {stats.topActors && stats.topActors.length > 0 ? (
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
            {stats.topDirectors && stats.topDirectors.length > 0 ? (
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