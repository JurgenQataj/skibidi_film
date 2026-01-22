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
  const [statsLimit, setStatsLimit] = useState(10); // [NEW] Limite visualizzazione (10, 20, 30)

  // Genera una lista di anni (dal corrente indietro fino al 1900)
  const years = Array.from(new Array(currentYear - 1900 + 1), (val, index) => currentYear - index);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true); // Mostra caricamento quando cambia l'anno
      try {
        // Passiamo l'anno selezionato come parametro
        const res = await axios.get(`${API_URL}/api/users/${userId}/advanced-stats?year=${selectedYear}&limit=${statsLimit}`);
        setStats(res.data);
      } catch (error) {
        console.error("Errore stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId, API_URL, selectedYear, statsLimit]); // Ricarica se cambia limit

  if (loading) return <div className={styles.loading}>Caricamento Statistiche...</div>;
  if (!stats) return <div className={styles.error}>Impossibile caricare le statistiche.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{stats.username}'s Stats</h1>

      <div className={styles.controls} style={{ textAlign: "center", marginBottom: "30px" }}>
        <label style={{ marginRight: "10px", color: "#ccc" }}>Mostra Top:</label>
        <select 
            value={statsLimit} 
            onChange={(e) => setStatsLimit(parseInt(e.target.value))}
            className={styles.yearSelect} // Riutilizziamo lo stile select
        >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
        </select>
      </div>

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
                  <a href={`/person/${encodeURIComponent(actor.name)}`} className={styles.personLink} style={{textDecoration: 'none', color: 'inherit', flex: 1}}>
                    <span className={styles.name} style={{fontWeight: 'bold', cursor: 'pointer',  transition: 'color 0.2s'}} 
                          onMouseOver={e => e.currentTarget.style.color = '#ff00cc'} 
                          onMouseOut={e => e.currentTarget.style.color = 'inherit'}>
                        {actor.name}
                    </span>
                  </a>
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
                   <a href={`/person/${encodeURIComponent(dir.name)}`} className={styles.personLink} style={{textDecoration: 'none', color: 'inherit', flex: 1}}>
                    <span className={styles.name} style={{fontWeight: 'bold', cursor: 'pointer', transition: 'color 0.2s'}}
                           onMouseOver={e => e.currentTarget.style.color = '#ff00cc'} 
                           onMouseOut={e => e.currentTarget.style.color = 'inherit'}>
                        {dir.name}
                    </span>
                   </a>
                  <span className={styles.count}>{dir.count} film</span>
                </li>
              ))
            ) : (
              <p className={styles.emptyMsg}>Dati registi non disponibili.</p>
            )}
          </ul>
        </section>

        {/* Sezione 5: Top Generi [NEW] */}
        <section className={styles.statSection}>
          <h2>Generi Preferiti</h2>
          <div className={styles.genreList}>
            {stats.topGenres && stats.topGenres.length > 0 ? (
              stats.topGenres.map((genre, idx) => {
                // Calcola larghezza barra (max è il primo elemento)
                const maxCount = stats.topGenres[0].count;
                const percent = (genre.count / maxCount) * 100;
                
                return (
                    <div key={idx} className={styles.genreItem} style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span>{genre.name}</span>
                            <span style={{ color: "#aaa" }}>{genre.count}</span>
                        </div>
                        <div style={{ width: "100%", background: "rgba(255,255,255,0.1)", borderRadius: "4px", height: "8px" }}>
                             <div style={{ 
                                 width: `${percent}%`, 
                                 background: "linear-gradient(90deg, #ff00cc, #333399)", 
                                 height: "100%", 
                                 borderRadius: "4px" 
                             }} />
                        </div>
                    </div>
                );
              })
            ) : (
              <p className={styles.emptyMsg}>Dati generi non disponibili.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default StatsPage;