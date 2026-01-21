import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./PersonPage.module.css";
import MovieCard from "../components/MovieCard";

function PersonPage() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <div className={styles.loading}>Caricamento filmografia di {decodedName}...</div>;
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

  const directedMovies = data ? filterMovies(data.directed) : [];
  const actedMovies = data ? filterMovies(data.acted) : [];

  const hasDirected = directedMovies.length > 0;
  const hasActed = actedMovies.length > 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{data.personName}</h1>
      
      {/* FILTER TOGGLE */}
      {/* FILTER BUTTON & DROPDOWN */}
      <div className={styles.filterContainer} style={{ textAlign: "center", marginBottom: "30px", position: "relative", zIndex: 10, display: "flex", justifyContent: "center", gap: "15px" }}>
        {/* SORT BUTTON */}
        <button
           onClick={() => setSortBy(sortBy === "date" ? "revenue" : "date")}
           style={{
            background: sortBy === "revenue" ? "linear-gradient(135deg, #FFD700, #FFA500)" : "#333", // Gold for revenue
            color: "white",
            padding: "12px 24px",
            border: "none",
            borderRadius: "50px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
            transition: "all 0.3s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "1rem"
          }}
          title="Cambia ordinamento"
        >
          {sortBy === "revenue" ? "💰 Top Box Office" : "📅 Ordina per Data"}
        </button>

        <button
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          className={styles.filterButton}
        >
          Nascondi film useless {showFilterDropdown ? "▲" : "▼"}
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
      
      {!hasDirected && !hasActed && (
        <p className={styles.emptyMsg}>Nessun film trovato nel database per questa persona.</p>
      )}

      {hasDirected && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Regia ({directedMovies.length})</h2>
          <div className={styles.grid}>
            {directedMovies.map(movie => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </section>
      )}

      {hasActed && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cast ({actedMovies.length})</h2>
          <div className={styles.grid}>
            {actedMovies.map(movie => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default PersonPage;