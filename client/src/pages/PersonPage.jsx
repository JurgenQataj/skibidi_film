import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./PersonPage.module.css";
import MovieCard from "../components/MovieCard";

function PersonPage() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnlyRated, setShowOnlyRated] = useState(false);
  const [hideDocumentaries, setHideDocumentaries] = useState(false);
  const [hideShorts, setHideShorts] = useState(false); // [NUOVO] Filtro 'Under 40 min' (approssimato)
  const [hideObscure, setHideObscure] = useState(false); // [NUOVO] Filtro 'Regie sconosciute' (approssimato)
  const [showFilterDropdown, setShowFilterDropdown] = useState(false); // [NUOVO] Stato per il dropdown filtri

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
    
    // FILTRI APPROSSIMATI
    // I film corti/sconosciuti hanno di solito pochi o zero voti.
    // Soglia 5 voti per "Opere Sconosciute"
    if (hideObscure) filtered = filtered.filter((m) => m.vote_count && m.vote_count >= 5);
    
    // Soglia 50 voti per "Probabilmente Corti/Under 40"
    // (Un feature film, anche vecchio, ha quasi sempre > 50-100 voti su TMDB se è vagamente noto)
    if (hideShorts) filtered = filtered.filter((m) => m.vote_count && m.vote_count >= 100);

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
      {/* FILTER BUTTON & DROPDOWN */}
      <div className={styles.filterContainer} style={{ textAlign: "center", marginBottom: "30px", position: "relative", zIndex: 10 }}>
        <button
          onClick={() => setShowFilterDropdown(!showFilterDropdown)}
          style={{
            background: "linear-gradient(135deg, #6e8efb, #a777e3)",
            color: "white",
            padding: "12px 24px",
            border: "none",
            borderRadius: "50px",
            cursor: "pointer",
            fontWeight: "bold",
            boxShadow: "0 4px 15px rgba(110, 142, 251, 0.4)",
            transition: "all 0.3s ease",
            display: "inline-flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "1rem",
            letterSpacing: "0.5px"
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
          onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
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