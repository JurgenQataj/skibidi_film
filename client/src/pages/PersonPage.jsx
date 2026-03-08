import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./PersonPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard } from "../components/Skeleton";

function PersonPage() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  // Helper per inizializzare lo stato da localStorage
  const getInitialState = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  };

  const [showOnlyRated, setShowOnlyRated] = useState(() => getInitialState("showOnlyRated", false));
  const [hideDocumentaries, setHideDocumentaries] = useState(() => getInitialState("hideDocumentaries", false));
  const [hideShorts, setHideShorts] = useState(() => getInitialState("hideShorts", false));
  const [hideObscure, setHideObscure] = useState(() => getInitialState("hideObscure", false));
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState(() => getInitialState("sortBy", "date"));

  // Salva le preferenze ogni volta che cambiano
  useEffect(() => {
    localStorage.setItem("showOnlyRated", JSON.stringify(showOnlyRated));
    localStorage.setItem("hideDocumentaries", JSON.stringify(hideDocumentaries));
    localStorage.setItem("hideShorts", JSON.stringify(hideShorts));
    localStorage.setItem("hideObscure", JSON.stringify(hideObscure));
    localStorage.setItem("sortBy", JSON.stringify(sortBy));
  }, [showOnlyRated, hideDocumentaries, hideShorts, hideObscure, sortBy]);

  const API_URL = import.meta.env.VITE_API_URL || "";
  const decodedName = decodeURIComponent(name);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      setLoading(true);
      try {
        // Chiamata all'API che abbiamo creato nel backend
        const res = await axios.get(`${API_URL}/api/movies/person/${encodeURIComponent(name)}`);
        setData(res.data);
      } catch (error) {
        console.error("Errore caricamento persona:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [name, API_URL]);

  if (loading) return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {Array.from({ length: 12 }).map((_, i) => <SkeletonMovieCard key={i} />)}
      </div>
    </div>
  );
  if (!data) return <div className={styles.error}>Nessun dato trovato per "{decodedName}".</div>;

  const filterMovies = (list) => {
    let filtered = list;
    if (showOnlyRated) filtered = filtered.filter((m) => m.vote_average && m.vote_average > 0);
    if (hideDocumentaries) filtered = filtered.filter((m) => !m.genre_ids?.includes(99));
    
    // FILTRI PRECISI
    // Filtro "Regie Sconosciute": Nasconde se il ruolo è esplicitamente segnato come "uncredited" o "unknown" 
    // oppure se il job (per la crew) non è specificato.
    if (hideObscure) {
        filtered = filtered.filter((m) => {
            const char = (m.character || "").toLowerCase();
            const job = (m.job || "").toLowerCase();
            const badKeywords = ["sconosciuto", "unknown", "uncredited"];
            // Se contiene una parola chiave "bad", lo nascondiamo (return false)
            if (badKeywords.some(w => char.includes(w) || job.includes(w))) return false;
            return true;
        });
    }
    
    // Filtro "Under 40 min": Usa il flag is_short calcolato dal server (preciso!)
    if (hideShorts) filtered = filtered.filter((m) => !m.is_short);
    
    // ORDINAMENTO
    if (sortBy === "revenue") {
        filtered.sort((a, b) => {
            const rankA = a.revenue_rank || 10000;
            const rankB = b.revenue_rank || 10000;
            return rankA - rankB;
        });
    } else {
        // Default: Date Descending
        filtered.sort((a, b) => {
             const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
             const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
             return dateB - dateA;
        });
    }

    return filtered;
  };

  const directedMovies = data?.directed ? filterMovies(data.directed) : [];
  const actedMovies = data?.acted ? filterMovies(data.acted) : [];
  const directedTvMovies = data?.directedTv ? filterMovies(data.directedTv) : [];
  const actedTvMovies = data?.actedTv ? filterMovies(data.actedTv) : [];

  const hasDirected = directedMovies.length > 0;
  const hasActed = actedMovies.length > 0;
  const hasDirectedTv = directedTvMovies.length > 0;
  const hasActedTv = actedTvMovies.length > 0;

  return (
    <div className={styles.container}>
      
      {/* SEZIONE INFO PERSONA */}
      <div className={styles.personHeader}>
        <img
          src={
            data.profile_path
              ? `https://image.tmdb.org/t/p/w500${data.profile_path}`
              : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"
          }
          alt={data.personName}
          className={styles.personImage}
        />
        <div className={styles.personInfo}>
          <h1 className={styles.pageTitle}>{data.personName}</h1>
          {data.biography ? (
            <div className={styles.biographyContainer}>
              <h3 className={styles.biographyTitle}>Biografia</h3>
              <p className={`${styles.biographyText} ${!isBioExpanded ? styles.clampedBio : ""}`}>
                {data.biography}
              </p>
              {data.biography.length > 400 && (
                <button 
                  className={styles.toggleBioButton}
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                >
                  {isBioExpanded ? "Mostra meno" : "Leggi di più"}
                </button>
              )}
            </div>
          ) : (
            <p className={styles.biographyText}>Nessun biografia disponibile su TMDB.</p>
          )}
        </div>
      </div>
      
      {/* FILTER TOGGLE */}
      {/* FILTER BUTTON & DROPDOWN */}
      <div className={styles.filterContainer} style={{ textAlign: "center", marginBottom: "30px", position: "relative", zIndex: 10, display: "flex", justifyContent: "center", gap: "15px" }}>
        {/* SORT BUTTON */}
        <button
           onClick={() => setSortBy(sortBy === "date" ? "revenue" : "date")}
           className={styles.sortButton}
           title="Cambia ordinamento"
        >
          {sortBy === "revenue" ? "💰 Top Box Office" : "📅 Ordina per Data"}
        </button>

        <button
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className={styles.filterButton}
        >
          ⚙️ Nascondi film {showFilterDropdown ? "▲" : "▼"}
        </button>

        {showFilterDropdown && (
          <div
            style={{
              position: "absolute",
              top: "120%",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "rgba(30, 30, 30, 0.95)",
              backdropFilter: "blur(10px)",
              padding: "20px",
              borderRadius: "15px",
              display: "flex",
              flexDirection: "column",
              gap: "15px",
              alignItems: "flex-start",
              width: "280px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              animation: "fadeIn 0.2s ease-out"
            }}
          >
            {[
              { label: "Nascondi film senza voto", checked: showOnlyRated, setter: setShowOnlyRated },
              { label: "Nascondi Documentari", checked: hideDocumentaries, setter: setHideDocumentaries },
              { label: "Nascondi Under 40 min", checked: hideShorts, setter: setHideShorts },
              { label: "Nascondi Regie Sconosciute", checked: hideObscure, setter: setHideObscure },
            ].map((option, index) => (
              <label 
                key={index} 
                style={{ 
                  color: "#eee", 
                  cursor: "pointer", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "12px", 
                  width: "100%", 
                  fontSize: "0.95rem",
                  userSelect: "none"
                }}
              >
                <input
                  type="checkbox"
                  checked={option.checked}
                  onChange={(e) => option.setter(e.target.checked)}
                  style={{ 
                    width: "20px", 
                    height: "20px", 
                    cursor: "pointer", 
                    accentColor: "#a777e3" 
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}
      </div>
      
      {!hasDirected && !hasActed && !hasDirectedTv && !hasActedTv && (
        <p className={styles.emptyMsg}>Nessun contenuto trovato nel database per questa persona.</p>
      )}

      {hasDirected && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Regia ({directedMovies.length})</h2>
          <div className={styles.grid}>
            {directedMovies.map((movie, index) => (
              <MovieCard key={`mov-dir-${movie._id}-${index}`} movie={movie} />
            ))}
          </div>
        </section>
      )}

      {hasActed && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cast ({actedMovies.length})</h2>
          <div className={styles.grid}>
            {actedMovies.map((movie, index) => (
              <MovieCard key={`mov-act-${movie._id}-${index}`} movie={movie} />
            ))}
          </div>
        </section>
      )}

      {hasDirectedTv && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Regia Serie TV ({directedTvMovies.length})</h2>
          <div className={styles.grid}>
            {directedTvMovies.map((show, index) => (
              <MovieCard key={`tv-dir-${show._id}-${index}`} movie={show} />
            ))}
          </div>
        </section>
      )}

      {hasActedTv && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Serie TV ({actedTvMovies.length})</h2>
          <div className={styles.grid}>
            {actedTvMovies.map((show, index) => (
              <MovieCard key={`tv-act-${show._id}-${index}`} movie={show} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default PersonPage;