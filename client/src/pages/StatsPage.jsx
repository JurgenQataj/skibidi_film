import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import styles from "./StatsPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonWithLogo } from "../components/Skeleton";

// --- Extracted Sub-Components to Reduce Cognitive Complexity ---

const FavoritePeopleSection = ({ stats, userId, personTypeTab, setPersonTypeTab, actorsLimit, setActorsLimit, directorsLimit, setDirectorsLimit, styles, avatars }) => {
  const isActors = personTypeTab === "actors";
  const currentList = isActors ? stats.topActors : stats.topDirectors;
  const currentLimit = isActors ? actorsLimit : directorsLimit;
  const setLimit = isActors ? setActorsLimit : setDirectorsLimit;
  const personLabel = isActors ? "attori" : "registi";

  return (
    <section className={styles.statSection}>
      <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
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
        {!currentList || currentList.length === 0 ? (
          <p className={styles.emptyMsg}>Dati {personLabel} non disponibili.</p>
        ) : (
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
                  {avatars && avatars[person.name] && (
                     <img src={`https://image.tmdb.org/t/p/w185${avatars[person.name]}`} alt={person.name} style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link 
                    to={`/profile/${userId}/history?filter=${isActors ? 'actor' : 'director'}&value=${encodeURIComponent(person.name)}`} 
                    className={styles.count}
                    style={{ textDecoration: 'none' }}
                  >
                    {person.count} film
                  </Link>
                </div>
              </li>
            ))}
            {currentList.length > currentLimit && currentLimit < 30 && (
              <button className={styles.showMoreBtn} onClick={() => setLimit(30)}>Mostra fino a 30 {personLabel}</button>
            )}
          </>
        )}
      </ul>
    </section>
  );
};

const KeywordsSection = ({ stats, userId, keywordTab, setKeywordTab, keywordsLimit, setKeywordsLimit, styles }) => {
  const isCount = keywordTab === "count";
  const currentList = isCount ? stats.topKeywords : stats.topKeywordsByRating;

  return (
    <section className={styles.statSection}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0 }}>Temi e parole chiave</h2>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "4px" }}>
          <button 
            onClick={() => setKeywordTab("count")}
            style={{ border: "none", background: keywordTab === "count" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s", fontSize: '0.8rem' }}
          >
            PIÙ VISTI
          </button>
          <button 
            onClick={() => setKeywordTab("rating")}
            style={{ border: "none", background: keywordTab === "rating" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s", fontSize: '0.8rem' }}
          >
            MEDIA VOTO
          </button>
        </div>
      </div>

      <ul className={styles.textList}>
        {!currentList || currentList.length === 0 ? (
          <p className={styles.emptyMsg}>Nessun dato relativo ai temi disponibile.</p>
        ) : (
          <>
            {currentList.slice(0, keywordsLimit).map((keyword, idx) => (
              <li key={idx} className={styles.textItem} style={{ alignItems: 'center' }}>
                <span className={styles.rank}>#{idx + 1}</span>
                <div className={styles.keywordPill}>
                  {keyword.name}
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isCount ? (
                    <Link 
                      to={`/profile/${userId}/history?filter=keyword&value=${encodeURIComponent(keyword.name)}`}
                      className={styles.count}
                      style={{ textDecoration: 'none' }}
                    >
                      {keyword.count} film
                    </Link>
                  ) : (
                    <>
                      <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.1rem' }}>★ {keyword.avg}</span>
                      <Link 
                        to={`/profile/${userId}/history?filter=keyword&value=${encodeURIComponent(keyword.name)}`}
                        className={styles.statLink}
                        style={{ fontSize: '0.8rem' }}
                      >
                        ({keyword.count} film)
                      </Link>
                    </>
                  )}
                </div>
              </li>
            ))}
            {currentList.length > keywordsLimit && keywordsLimit < 30 && (
              <button className={styles.showMoreBtn} onClick={() => setKeywordsLimit(30)}>Mostra fino a 30</button>
            )}
          </>
        )}
      </ul>
    </section>
  );
};


const CrewSection = ({ stats, userId, crewTypeTab, setCrewTypeTab, crewLimit, setCrewLimit, styles }) => {
  let currentCrewList = [];
  if (crewTypeTab === "studios") {
    currentCrewList = stats.topStudios;
  } else if (stats.topCrewByJob && stats.topCrewByJob[crewTypeTab]) {
    currentCrewList = stats.topCrewByJob[crewTypeTab];
  }

  return (
    <section className={styles.statSection}>
      <div className={styles.sectionHeader}>
        <h2>Dietro le Quinte</h2>
        <select 
          value={crewTypeTab} 
          onChange={(e) => {
            setCrewTypeTab(e.target.value);
            setCrewLimit(10);
          }}
          className={styles.premiumSelect}
        >
          <option value="studios">Studi di Produzione</option>

          <option value="" disabled>─ Effetti ─</option>
          <option value="Special Effects">&nbsp;&nbsp;Special Effects</option>
          <option value="Visual Effects Supervisor">&nbsp;&nbsp;Visual Effects Supervisor</option>
          <option value="VFX Artist">&nbsp;&nbsp;VFX Artist</option>

          <option value="" disabled>─ Suono e Musica ─</option>
          <option value="Original Music Composer">&nbsp;&nbsp;Original Music Composer</option>
          <option value="Sound Designer">&nbsp;&nbsp;Sound Designer</option>
          <option value="Sound Mixer">&nbsp;&nbsp;Sound Mixer</option>
          <option value="Original Song Writer">&nbsp;&nbsp;Original Song Writer</option>

          <option value="" disabled>─ Produzione ─</option>
          <option value="Producer">&nbsp;&nbsp;Producer</option>
          <option value="Executive Producer">&nbsp;&nbsp;Executive Producer</option>

          <option value="" disabled>─ Fotografia e Luci ─</option>
          <option value="Director of Photography">&nbsp;&nbsp;Director of Photography</option>
          <option value="Camera Operator">&nbsp;&nbsp;Camera Operator</option>
          <option value="Lighting Technician">&nbsp;&nbsp;Lighting Technician</option>
          <option value="Gaffer">&nbsp;&nbsp;Gaffer</option>

          <option value="" disabled>─ Scenografia e Design ─</option>
          <option value="Production Design">&nbsp;&nbsp;Production Design</option>
          <option value="Art Direction">&nbsp;&nbsp;Art Direction</option>
          <option value="Set Decoration">&nbsp;&nbsp;Set Decoration</option>

          <option value="" disabled>─ Sceneggiatura ─</option>
          <option value="Writer">&nbsp;&nbsp;Writer</option>
          <option value="Screenplay">&nbsp;&nbsp;Screenplay</option>
          <option value="Original Story">&nbsp;&nbsp;Original Story</option>
          <option value="Characters">&nbsp;&nbsp;Characters</option>
        </select>
      </div>

      <ul className={styles.textList}>
        {!currentCrewList || currentCrewList.length === 0 ? (
          <p className={styles.emptyMsg}>Nessun dato relativo a questa categoria da classificare.</p>
        ) : (
          <>
            {currentCrewList.slice(0, crewLimit).map((item, idx) => (
              <li key={idx} className={styles.textItem} style={{ alignItems: 'center' }}>
                <span className={styles.rank}>#{idx + 1}</span>
                <span className={styles.name} style={{ flex: 1, paddingLeft: '8px' }}>
                    {item.name}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link 
                    to={`/profile/${userId}/history?filter=${crewTypeTab === 'studios' ? 'studio' : 'crew'}&value=${encodeURIComponent(item.name)}${crewTypeTab !== 'studios' ? `&subValue=${encodeURIComponent(crewTypeTab)}` : ''}`}
                    className={styles.count}
                    style={{ textDecoration: 'none' }}
                  >
                    {item.count} film
                  </Link>
                </div>
              </li>
            ))}
            {currentCrewList.length > crewLimit && crewLimit < 30 && (
              <button className={styles.showMoreBtn} onClick={() => setCrewLimit(30)}>Mostra fino a 30</button>
            )}
          </>
        )}
      </ul>
    </section>
  );
};

const GeoSection = ({ stats, userId, geoTab, setGeoTab, countriesLimit, setCountriesLimit, languagesLimit, setLanguagesLimit, styles }) => {
  return (
    <section className={styles.statSection}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
        <h2 style={{ margin: 0 }}>Origini</h2>
        <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "4px" }}>
          <button
            onClick={() => setGeoTab("countries")}
            style={{ border: "none", background: geoTab === "countries" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
          >
            Paesi
          </button>
          <button
            onClick={() => setGeoTab("languages")}
            style={{ border: "none", background: geoTab === "languages" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
          >
            Lingue
          </button>
        </div>
      </div>

      {geoTab === "countries" ? (
        <div className={styles.genreList}>
          {stats.topCountries && stats.topCountries.length > 0 ? (
            <>
              {stats.topCountries.slice(0, countriesLimit).map((item, idx) => {
                const maxCount = stats.topCountries[0].count;
                const percent = (item.count / maxCount) * 100;
                return (
                  <div key={idx} className={styles.genreItem}>
                    <div className={styles.genreItemHeader}>
                      <span>{item.name}</span>
                      <Link 
                        to={`/profile/${userId}/history?filter=country&value=${encodeURIComponent(item.name)}`}
                        className={styles.statLink}
                      >
                        {item.count}
                      </Link>
                    </div>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {stats.topCountries.length > countriesLimit && (
                <button className={styles.showMoreBtn} onClick={() => setCountriesLimit(stats.topCountries.length)}>Mostra tutti i paesi</button>
              )}
            </>
          ) : (
            <p className={styles.emptyMsg}>Dati paesi non disponibili.</p>
          )}
        </div>
      ) : (
        <div className={styles.genreList}>
          {stats.topLanguages && stats.topLanguages.length > 0 ? (
            <>
              {stats.topLanguages.slice(0, languagesLimit).map((item, idx) => {
                const maxCount = stats.topLanguages[0].count;
                const percent = (item.count / maxCount) * 100;
                return (
                  <div key={idx} className={styles.genreItem}>
                    <div className={styles.genreItemHeader}>
                      <span>{item.name}</span>
                      <Link 
                        to={`/profile/${userId}/history?filter=language&value=${encodeURIComponent(item.name)}`}
                        className={styles.statLink}
                      >
                        {item.count}
                      </Link>
                    </div>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
              {stats.topLanguages.length > languagesLimit && (
                <button className={styles.showMoreBtn} onClick={() => setLanguagesLimit(stats.topLanguages.length)}>Mostra tutte le lingue</button>
              )}
            </>
          ) : (
            <p className={styles.emptyMsg}>Dati lingue non disponibili.</p>
          )}
        </div>
      )}
    </section>
  );
};


function StatsPage() {
  const { userId } = useParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatars, setAvatars] = useState({});
  
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
  
  // Limiti Decenni
  const [decadeTab, setDecadeTab] = useState("count"); // "count" o "rating"
  const [decadesLimit, setDecadesLimit] = useState(10);
  const [decadesRatingLimit, setDecadesRatingLimit] = useState(10);

  // Limiti per la sezione persone unificata
  const [actorsLimit, setActorsLimit] = useState(10);
  const [directorsLimit, setDirectorsLimit] = useState(10);

  // Stato per la nuova sezione Crew e Dietro le Quinte
  const [crewTypeTab, setCrewTypeTab] = useState("studios");
  const [crewLimit, setCrewLimit] = useState(10);

  // Stato per la sezione Paesi / Lingue
  const [geoTab, setGeoTab] = useState("countries"); // "countries" o "languages"
  const [countriesLimit, setCountriesLimit] = useState(10);
  const [languagesLimit, setLanguagesLimit] = useState(10);
  const [keywordsLimit, setKeywordsLimit] = useState(10);
  const [keywordTab, setKeywordTab] = useState("count"); // "count" o "rating"

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
        setDecadesLimit(10);
        setDecadesRatingLimit(10);
        setCrewLimit(10);
        setCountriesLimit(10);
        setLanguagesLimit(10);
        setKeywordsLimit(10);
      } catch (error) {
        console.error("Errore stats:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [userId, API_URL, selectedYear]); // Rimosso statsLimit dalle dipendenze, ora è costante

  // Fetch avatars for top actors and directors on the client side without blocking the initial render
  useEffect(() => {
    if (!stats) return;
    const namesToFetch = [];
    if (stats.topActors) {
      namesToFetch.push(...stats.topActors.slice(0, actorsLimit).map(a => a.name));
    }
    if (stats.topDirectors) {
      namesToFetch.push(...stats.topDirectors.slice(0, directorsLimit).map(d => d.name));
    }
    
    // Only fetch names we haven't loaded yet
    const missingNames = [...new Set(namesToFetch)].filter(name => !avatars[name]);
    if (missingNames.length === 0) return;
    
    axios.post(`${API_URL}/api/movies/avatars`, { names: missingNames })
      .then(res => {
         setAvatars(prev => ({ ...prev, ...res.data }));
      })
      .catch(err => console.error("Errore fetch avatars:", err));
  }, [stats, actorsLimit, directorsLimit, API_URL]);

  if (loading && !stats) {
    return <SkeletonWithLogo />;
  }

  if (!stats) return <div className={styles.error}>Impossibile caricare le statistiche.</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>Stats di {stats.username}</h1>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{stats.totalFilms?.toLocaleString('en-US') || 0}</div>
          <div className={styles.summaryLabel}>Films</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{stats.totalHours?.toLocaleString('en-US') || 0}</div>
          <div className={styles.summaryLabel}>Hours</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{stats.totalDirectors?.toLocaleString('en-US') || 0}</div>
          <div className={styles.summaryLabel}>Directors</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryValue}>{stats.totalCountries?.toLocaleString('en-US') || 0}</div>
          <div className={styles.summaryLabel}>Countries</div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        {/* Sezione 1: Top 10 Film per Anno Selezionabile */}
        <section className={styles.statSection}>
          <div className={styles.sectionHeader}>
            <h2>I Tuoi Film Preferiti del {selectedYear}</h2>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className={styles.premiumSelect}
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
        <FavoritePeopleSection
          stats={stats}
          userId={userId}
          personTypeTab={personTypeTab}
          setPersonTypeTab={setPersonTypeTab}
          actorsLimit={actorsLimit}
          setActorsLimit={setActorsLimit}
          directorsLimit={directorsLimit}
          setDirectorsLimit={setDirectorsLimit}
          styles={styles}
          avatars={avatars}
        />

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
                      <div key={idx} className={styles.genreItem}>
                          <div className={styles.genreItemHeader}>
                              <span>{genre.name}</span>
                          <Link 
                            to={`/profile/${userId}/history?filter=genre&value=${encodeURIComponent(genre.name)}`}
                            className={styles.statLink}
                          >
                            {genre.count}
                          </Link>
                          </div>
                          <div className={styles.progressContainer}>
                               <div 
                                   className={styles.progressBar}
                                   style={{ width: `${percent}%` }} 
                               />
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
                        <Link 
                          to={`/profile/${userId}/history?filter=genre&value=${encodeURIComponent(genre.name)}`}
                          className={styles.statLink}
                          style={{ fontSize: '0.9rem' }}
                        >
                          ({genre.count} film)
                        </Link>
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

        {/* --- NUOVA SEZIONE: DECENNI --- */}
        <section className={styles.statSection}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ margin: 0 }}>Decenni</h2>
            <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "4px" }}>
              <button 
                onClick={() => setDecadeTab("count")}
                style={{ border: "none", background: decadeTab === "count" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
              >
                Più visti
              </button>
              <button 
                onClick={() => setDecadeTab("rating")}
                style={{ border: "none", background: decadeTab === "rating" ? "linear-gradient(90deg, #d72638, #8c050c)" : "transparent", color: "white", padding: "6px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "bold", transition: "all 0.2s" }}
              >
                Media Voto
              </button>
            </div>
          </div>

          {decadeTab === "count" ? (
            <div className={styles.genreList}>
              {stats.topDecades && stats.topDecades.length > 0 ? (
                <>
                  {stats.topDecades.slice(0, decadesLimit).map((decade, idx) => {
                    const maxCount = stats.topDecades[0].count;
                    const percent = (decade.count / maxCount) * 100;
                    
                    return (
                      <div key={idx} className={styles.genreItem}>
                          <div className={styles.genreItemHeader}>
                              <span>{decade.name}</span>
                          <Link 
                            to={`/profile/${userId}/history?filter=decade&value=${encodeURIComponent(decade.name)}`}
                            className={styles.statLink}
                          >
                            {decade.count}
                          </Link>
                          </div>
                          <div className={styles.progressContainer}>
                               <div 
                                   className={styles.progressBar}
                                   style={{ width: `${percent}%` }} 
                               />
                          </div>
                       </div>
                    );
                  })}
                  {stats.topDecades.length > decadesLimit && (
                    <button className={styles.showMoreBtn} onClick={() => setDecadesLimit(stats.topDecades.length)}>Mostra tutti i decenni</button>
                  )}
                </>
              ) : (
                <p className={styles.emptyMsg}>Dati decenni non disponibili.</p>
              )}
            </div>
          ) : (
            <ul className={styles.textList}>
              {stats.topDecadesByRating && stats.topDecadesByRating.length > 0 ? (
                <>
                  {stats.topDecadesByRating.slice(0, decadesRatingLimit).map((decade, idx) => (
                    <li key={idx} className={styles.textItem}>
                      <span className={styles.rank}>#{idx + 1}</span>
                      <span className={styles.name}>{decade.name}</span>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '1.1rem' }}>★ {decade.avg}</span>
                        <Link 
                          to={`/profile/${userId}/history?filter=decade&value=${encodeURIComponent(decade.name)}`}
                          className={styles.statLink}
                          style={{ fontSize: '0.9rem' }}
                        >
                          ({decade.count} film)
                        </Link>
                      </div>
                    </li>
                  ))}
                  {stats.topDecadesByRating.length > decadesRatingLimit && (
                    <button className={styles.showMoreBtn} onClick={() => setDecadesRatingLimit(stats.topDecadesByRating.length)}>Mostra tutti i decenni</button>
                  )}
                </>
              ) : (
                <p className={styles.emptyMsg}>Dati insufficienti.</p>
              )}
            </ul>
          )}
        </section>

        {/* --- NUOVA SEZIONE: TOP CREW & STUDIOS --- */}
        <CrewSection 
          stats={stats} 
          userId={userId} 
          crewTypeTab={crewTypeTab} 
          setCrewTypeTab={setCrewTypeTab} 
          crewLimit={crewLimit} 
          setCrewLimit={setCrewLimit} 
          styles={styles} 
        />

        {/* --- SEZIONE: PAESI E LINGUE --- */}
        <GeoSection 
          stats={stats} 
          userId={userId} 
          geoTab={geoTab} 
          setGeoTab={setGeoTab} 
          countriesLimit={countriesLimit} 
          setCountriesLimit={setCountriesLimit} 
          languagesLimit={languagesLimit} 
          setLanguagesLimit={setLanguagesLimit} 
          styles={styles} 
        />
        
        {/* --- NUOVA SEZIONE: TEMI E PAROLE CHIAVE --- */}
        <KeywordsSection
          stats={stats}
          userId={userId}
          keywordTab={keywordTab}
          setKeywordTab={setKeywordTab}
          keywordsLimit={keywordsLimit}
          setKeywordsLimit={setKeywordsLimit}
          styles={styles}
        />

      </div>
    </div>
  );
}

export default StatsPage;