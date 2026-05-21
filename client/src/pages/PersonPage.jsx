import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./PersonPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard } from "../components/Skeleton";
import { FiBookmark } from "react-icons/fi";
import { FaBookmark } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

function PersonPage() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Helper per inizializzare lo stato da localStorage
  const getInitialState = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  };

  const [showOnlyRated, setShowOnlyRated] = useState(() => getInitialState("showOnlyRated", false));
  const [hideDocumentaries, setHideDocumentaries] = useState(() => getInitialState("hideDocumentaries", false));
  const [hideShorts, setHideShorts] = useState(() => getInitialState("hideShorts", false));
  const [hideObscure, setHideObscure] = useState(() => getInitialState("hideObscure", true));
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
        const token = localStorage.getItem("token");
        let currentUserId = null;
        if (token) {
          const decoded = jwtDecode(token);
          currentUserId = decoded.user.id;
          setLoggedInUserId(currentUserId);
        }

        const res = await axios.get(`${API_URL}/api/movies/person/${encodeURIComponent(name)}`);
        setData(res.data);

        // Se loggato, verifica se la persona è tra i salvati
        if (currentUserId && res.data.personId) {
          const profileRes = await axios.get(`${API_URL}/api/users/${currentUserId}/profile`);
          const savedPeople = profileRes.data.savedPeople || [];
          setIsSaved(savedPeople.some(p => p.id === res.data.personId));
        }
      } catch (error) {
        console.error("Errore caricamento persona:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [name, API_URL]);

  const handleToggleSave = async () => {
    if (!loggedInUserId || !data || !data.personId) return;
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      if (isSaved) {
        await axios.delete(`${API_URL}/api/users/${loggedInUserId}/saved-people/${data.personId}`, config);
        setIsSaved(false);
      } else {
        await axios.post(`${API_URL}/api/users/${loggedInUserId}/saved-people`, {
          personId: data.personId,
          name: data.personName,
          profile_path: data.profile_path
        }, config);
        setIsSaved(true);
      }
    } catch (error) {
      console.error("Errore durante il salvataggio persona:", error);
      alert("Errore durante il salvataggio.");
    }
  };

  const handleToggleSort = () => {
    if (sortBy === "date") setSortBy("popularity");
    else if (sortBy === "popularity") setSortBy("vote_count");
    else if (sortBy === "vote_count") setSortBy("revenue");
    else setSortBy("date");
  };

  const getSortLabel = () => {
    if (sortBy === "popularity") return "🔥 Popolarità";
    if (sortBy === "vote_count") return "🗳️ Numero Voti";
    if (sortBy === "revenue") return "💰 Top Box Office";
    return "📅 Data di Uscita";
  };

  const filterMovies = (list) => {
    let filtered = [...list];
    if (showOnlyRated) filtered = filtered.filter((m) => m.vote_average && m.vote_average > 0);
    if (hideDocumentaries) filtered = filtered.filter((m) => !m.genre_ids?.includes(99));
    
    // FILTRI PRECISI
    if (hideObscure) {
        filtered = filtered.filter((m) => {
            const char = (m.character || "").toLowerCase();
            const title = (m.title || "").toLowerCase();

            // Rileva ruoli non accreditati o sconosciuti
            const badRoleKeywords = [
              "sconosciuto", "unknown", "uncredited", "non accreditato", "uncredited role",
              "himself", "herself", "self", "se stesso", "se stessa",
              "host", "presenter", "presentatore", "guest", "ospite", "narrator", "narratore"
            ];
            
            if (badRoleKeywords.some(w => 
              char === w || 
              char.startsWith(w + " ") || 
              char.endsWith(" " + w) || 
              char.includes("(" + w + ")") || 
              char === "guest star"
            )) {
              return false;
            }

            // Rileva film minori estremamente oscuri (senza voti, popolarità bassissima)
            const currentYear = new Date().getFullYear();
            const releaseYear = m.release_date ? new Date(m.release_date).getFullYear() : null;
            const isRecent = releaseYear && releaseYear >= currentYear - 1;

            const hasNoVotes = !m.vote_count || m.vote_count === 0;
            const isVeryLowPopularity = m.popularity !== undefined && m.popularity < 1.5;

            if (hasNoVotes && isVeryLowPopularity && !isRecent) {
              return false;
            }

            // Rileva titoli TV di talk show, interviste o premiazioni
            const badTitleKeywords = [
              "the tonight show", "jimmy kimmel", "late night", "live with", 
              "the oscars", "academy awards", "golden globe", "behind the scenes",
              "entertainment tonight", "the late late show"
            ];
            if (badTitleKeywords.some(w => title.includes(w))) {
              return false;
            }

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
    } else if (sortBy === "popularity") {
        filtered.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else if (sortBy === "vote_count") {
        filtered.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
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

  if (loading) return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {Array.from({ length: 12 }).map((_, i) => <SkeletonMovieCard key={i} />)}
      </div>
    </div>
  );
  if (!data) return <div className={styles.error}>Nessun dato trovato per "{decodedName}".</div>;

  // Calcola popolarità totale media o massima per le statistiche
  const getPopularityValue = () => {
    const dPop = data.directed?.[0]?.popularity || 0;
    const aPop = data.acted?.[0]?.popularity || 0;
    return Math.max(dPop, aPop);
  };
  const popularityValue = getPopularityValue();

  return (
    <div className={styles.container}>
      {/* Dynamic blurred background portal */}
      {data.profile_path && (
        <div 
          className={styles.dynamicBackdrop} 
          style={{ 
            backgroundImage: `url(https://image.tmdb.org/t/p/w300${data.profile_path})` 
          }} 
        />
      )}

      {/* SEZIONE INFO PERSONA */}
      <div className={styles.personHeader}>
        <div className={styles.imageWrapper}>
          <img           
            src={
              data.profile_path
                ? `https://image.tmdb.org/t/p/w500${data.profile_path}`
                : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"
            }
            alt={data.personName}
            className={styles.personImage}
            loading="lazy" 
            decoding="async" 
          />
        </div>
        <div className={styles.personInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>{data.personName}</h1>
            {loggedInUserId && (
              <button 
                className={`${styles.savePersonBtn} ${isSaved ? styles.saved : ""}`}
                onClick={handleToggleSave}
                title={isSaved ? "Rimuovi dai salvati" : "Salva talento"}
              >
                {isSaved ? <FaBookmark size={15} /> : <FiBookmark size={15} />}
                <span className={styles.saveBtnText}>{isSaved ? "Salvato" : "Salva"}</span>
              </button>
            )}
          </div>

          {/* STATS COUNT ROW */}
          <div className={styles.talentStats}>
            {(data.directed?.length > 0 || data.directedTv?.length > 0) && (
              <div className={styles.statTag}>
                🎬 <span>{data.directed.length + data.directedTv.length}</span> Direzioni
              </div>
            )}
            {(data.acted?.length > 0 || data.actedTv?.length > 0) && (
              <div className={styles.statTag}>
                🎭 <span>{data.acted.length + data.actedTv.length}</span> Recitazioni
              </div>
            )}
            {popularityValue > 0 && (
              <div className={styles.statTag}>
                🔥 <span>{parseFloat(popularityValue).toFixed(1)}</span> Popolarità
              </div>
            )}
          </div>
          
          {data.biography ? (
            <div className={styles.biographyContainer}>
              <h3 className={styles.biographyTitle}>Biografia</h3>
              <p className={`${styles.biographyText} ${!isBioExpanded ? styles.clampedBio : ""}`}>
                {data.biography}
              </p>
              {data.biography.length > 350 && (
                <button 
                  className={styles.toggleBioButton}
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                >
                  {isBioExpanded ? "Mostra meno ▲" : "Leggi di più ▼"}
                </button>
              )}
            </div>
          ) : (
            <p className={styles.biographyText}>Nessuna biografia disponibile su TMDB.</p>
          )}
        </div>
      </div>
      
      {/* CONTROLS ROW */}
      <div className={styles.controlsRow}>
        <div className={styles.buttonGroup}>
          <button
             onClick={handleToggleSort}
             className={styles.sortButton}
             title="Cambia ordinamento"
          >
            Sort: <span>{getSortLabel()}</span>
          </button>

          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`${styles.filterButton} ${showFilterDropdown ? styles.activeFilterBtn : ""}`}
          >
            ⚙️ Filtra Elementi {showFilterDropdown ? "▲" : "▼"}
          </button>
        </div>

        <AnimatePresence>
          {showFilterDropdown && (
            <motion.div
              className={styles.filterDropdown}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {[
                { label: "Nascondi film senza voto", checked: showOnlyRated, setter: setShowOnlyRated },
                { label: "Nascondi Documentari", checked: hideDocumentaries, setter: setHideDocumentaries },
                { label: "Nascondi Under 40 min", checked: hideShorts, setter: setHideShorts },
                { label: "Nascondi film minori e talk-show", checked: hideObscure, setter: setHideObscure },
              ].map((option, index) => (
                <label key={index} className={styles.filterLabelOption}>
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(e) => option.setter(e.target.checked)}
                    className={styles.filterCheckbox}
                  />
                  <span className={styles.filterLabelText}>{option.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {!hasDirected && !hasActed && !hasDirectedTv && !hasActedTv && (
        <p className={styles.emptyMsg}>Nessun contenuto corrisponde ai filtri selezionati.</p>
      )}

      <AnimatePresence mode="wait">
        <div className={styles.sectionsContainer}>
          {hasDirected && (
            <motion.section 
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h2 className={styles.sectionTitle}>Regia Cinema ({directedMovies.length})</h2>
              <motion.div 
                className={styles.grid}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.02 }
                  }
                }}
              >
                {directedMovies.map((movie, index) => (
                  <motion.div
                    key={`mov-dir-${movie._id}-${index}`}
                    className={styles.cardWrapper}
                    variants={{
                      hidden: { opacity: 0, y: 15, scale: 0.95 },
                      visible: { opacity: 1, y: 0, scale: 1 }
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <MovieCard movie={movie} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {hasActed && (
            <motion.section 
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <h2 className={styles.sectionTitle}>Cast Cinema ({actedMovies.length})</h2>
              <motion.div 
                className={styles.grid}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.02 }
                  }
                }}
              >
                {actedMovies.map((movie, index) => (
                  <motion.div
                    key={`mov-act-${movie._id}-${index}`}
                    className={styles.cardWrapper}
                    variants={{
                      hidden: { opacity: 0, y: 15, scale: 0.95 },
                      visible: { opacity: 1, y: 0, scale: 1 }
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <MovieCard movie={movie} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {hasDirectedTv && (
            <motion.section 
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <h2 className={styles.sectionTitle}>Regia Serie TV ({directedTvMovies.length})</h2>
              <motion.div 
                className={styles.grid}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.02 }
                  }
                }}
              >
                {directedTvMovies.map((show, index) => (
                  <motion.div
                    key={`tv-dir-${show._id}-${index}`}
                    className={styles.cardWrapper}
                    variants={{
                      hidden: { opacity: 0, y: 15, scale: 0.95 },
                      visible: { opacity: 1, y: 0, scale: 1 }
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <MovieCard movie={show} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}

          {hasActedTv && (
            <motion.section 
              className={styles.section}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <h2 className={styles.sectionTitle}>Cast Serie TV ({actedTvMovies.length})</h2>
              <motion.div 
                className={styles.grid}
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.02 }
                  }
                }}
              >
                {actedTvMovies.map((show, index) => (
                  <motion.div
                    key={`tv-act-${show._id}-${index}`}
                    className={styles.cardWrapper}
                    variants={{
                      hidden: { opacity: 0, y: 15, scale: 0.95 },
                      visible: { opacity: 1, y: 0, scale: 1 }
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  >
                    <MovieCard movie={show} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.section>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
}

export default PersonPage;