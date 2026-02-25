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
  const backendLimit = 50; // Quanti dati richiedere al server in partenza
  
  // Limiti visualizzazione liste (partono da 10)
  const [genresLimit, setGenresLimit] = useState(10);
  const [genresRatingLimit, setGenresRatingLimit] = useState(10);
  const [personTypeTab, setPersonTypeTab] = useState("actors"); // "actors" o "directors"
  const [personMetricTab, setPersonMetricTab] = useState("count"); // "count" o "rating"
  const [genreTab, setGenreTab] = useState("count"); // "count" o "rating"
  // Limiti per la sezione persone unificata
  const [actorsLimit, setActorsLimit] = useState(10);
  const [directorsLimit, setDirectorsLimit] = useState(10);


  // Genera una lista di anni (dal corrente indietro fino al 1900)
  const years = Array.from(new Array(currentYear - 1900 + 1), (val, index) => currentYear - index);

  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true); // Mostra caricamento quando cambia l'anno
      try {
        // Passiamo l'anno selezionato come parametro
        const res = await axios.get(`${API_URL}/api/users/${userId}/advanced-stats?year=${selectedYear}&limit=${backendLimit}`);
        setStats(res.data);
        // Resetta i limiti quando si cambia anno o si ricarica
        setActorsLimit(10);
        setDirectorsLimit(10);
        setGenresLimit(10);
        setGenresRatingLimit(10);
      } catch (error) {
        console.error("Errore stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId, API_URL, selectedYear]); // Rimosso statsLimit dalle dipendenze, ora è costante

  if (loading) return <div className={styles.loading}>Caricamento Statistiche...</div>;
  if (!stats) return <div className={styles.error}>Impossibile caricare le statistiche.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Stats di {stats.username}</h1>

      <div className={styles.statsGrid}>
        {/* Sezione 1: Top 10 Film per Anno Selezionabile */}
        <section className={styles.statSection}>
          <div className={styles.sectionHeader}>
            <h2>I Tuoi Film Preferiti del {selectedYear}</h2>
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

        {/* Sezione Unificata: Persone Preferite (Attori / Registi) */}
        <section className={styles.statSection}>
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            
            {/* Switch: Attori o Registi */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "4px" }}>
                <button 
                  onClick={() => setPersonTypeTab("actors")}
                  style={{ border: "none", background: personTypeTab === "actors" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
                >
                  Attori
                </button>
                <button 
                  onClick={() => setPersonTypeTab("directors")}
                  style={{ border: "none", background: personTypeTab === "directors" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
                >
                  Registi
                </button>
              </div>
              <span style={{ fontSize: '1em', color: '#aaa' }}>preferiti</span>
            </div>
          </div>

          <ul className={styles.textList}>
            {(() => {
              // Determina la lista in base al tab selezionato
              const isActors = personTypeTab === "actors";
              const currentList = isActors ? stats.topActors : stats.topDirectors;
              
              const currentLimit = isActors ? actorsLimit : directorsLimit;
              const setLimit = isActors ? setActorsLimit : setDirectorsLimit;
              const personLabel = isActors ? "attori" : "registi";

              if (!currentList || currentList.length === 0) {
                 return <p className={styles.emptyMsg}>Dati {personLabel} non disponibili.</p>;
              }

              return (
                <>
                  {currentList.slice(0, currentLimit).map((person, idx) => (
                    <li key={idx} className={styles.textItem} style={{ alignItems: 'center' }}>
                      <span className={styles.rank}>#{idx + 1}</span>
                      <a href={`/person/${encodeURIComponent(person.name)}`} className={styles.personLink} style={{textDecoration: 'none', color: 'inherit', flex: 1, display: 'flex', alignItems: 'center', gap: '6px'}}>
                        <span className={styles.name} style={{fontWeight: 'bold', cursor: 'pointer',  transition: 'color 0.2s'}} 
                              onMouseOver={e => e.currentTarget.style.color = '#ff00cc'} 
                              onMouseOut={e => e.currentTarget.style.color = 'inherit'}>
                            {person.name}
                        </span>
                        {person.profile_path && (
                           <img src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} alt={person.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                        )}
                      </a>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.count}>{person.count} film</span>
                      </div>
                    </li>
                  ))}
                  {currentList.length > currentLimit && currentLimit < 30 && (
                    <button className={styles.showMoreBtn} onClick={() => setLimit(30)}>Mostra fino a 30 {personLabel}</button>
                  )}
                </>
              );
            })()}
          </ul>
        </section>

        {/* Sezione Generi Aggregata (Media Voto e Più visti) */}
        <section className={styles.statSection}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ margin: 0 }}>Generi</h2>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "4px" }}>
              <button 
                onClick={() => setGenreTab("count")}
                style={{ border: "none", background: genreTab === "count" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
              >
                Più visti
              </button>
              <button 
                onClick={() => setGenreTab("rating")}
                style={{ border: "none", background: genreTab === "rating" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
              >
                Media Voto
              </button>
            </div>
          </div>

          {genreTab === "count" ? (
            <div className={styles.genreList}>
              {stats.topGenres && stats.topGenres.length > 0 ? (
                <>
                  {stats.topGenres.slice(0, genresLimit).map((genre, idx) => {
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
                                   background: "linear-gradient(90deg, #d72638, #8c050c)", 
                                   height: "100%", 
                                   borderRadius: "4px" 
                               }} />
                          </div>
                       </div>
                    );
                  })}
                  {stats.topGenres.length > genresLimit && (
                    <button className={styles.showMoreBtn} onClick={() => setGenresLimit(stats.topGenres.length)}>Mostra tutti i generi</button>
                  )}
                </>
              ) : (
                <p className={styles.emptyMsg}>Dati generi non disponibili.</p>
              )}
            </div>
          ) : (
            <ul className={styles.textList}>
              {stats.topGenresByRating && stats.topGenresByRating.length > 0 ? (
                <>
                  {stats.topGenresByRating.slice(0, genresRatingLimit).map((genre, idx) => (
                    <li key={idx} className={styles.textItem}>
                      <span className={styles.rank}>#{idx + 1}</span>
                      <span className={styles.name}>{genre.name}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.1rem' }}>★ {genre.avg}</span>
                        <span style={{ color: '#aaa', fontSize: '0.9rem' }}>({genre.count} film)</span>
                      </div>
                    </li>
                  ))}
                  {stats.topGenresByRating.length > genresRatingLimit && (
                    <button className={styles.showMoreBtn} onClick={() => setGenresRatingLimit(stats.topGenresByRating.length)}>Mostra tutti i generi</button>
                  )}
                </>
              ) : (
                <p className={styles.emptyMsg}>Dati insufficienti (servono almeno 2 film per genere).</p>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export default StatsPage;