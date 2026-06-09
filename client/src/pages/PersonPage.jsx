import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./PersonPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard } from "../components/Skeleton";
import { FiBookmark, FiSliders, FiCalendar, FiAward, FiTrendingUp } from "react-icons/fi";
import { FaBookmark } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";

function PersonPage() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [news, setNews] = useState(null);
  const [loadingNews, setLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState(null);

  const handleLoadNews = async () => {
    if (!data || !data.personName) return;
    setLoadingNews(true);
    setNewsError(null);
    try {
      const res = await axios.get(`${API_URL}/api/news?q=${encodeURIComponent(data.personName)}&pageSize=6`);
      setNews(res.data.articles || []);
    } catch (err) {
      console.error("Errore caricamento news:", err);
      setNewsError("Impossibile caricare le ultime notizie.");
    } finally {
      setLoadingNews(false);
    }
  };

  const getInitialState = (key, defaultValue) => {
    const saved = localStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  };

  const [showOnlyRated, setShowOnlyRated] = useState(() => getInitialState("showOnlyRated", false));
  const [hideDocumentaries, setHideDocumentaries] = useState(() => getInitialState("hideDocumentaries", false));
  const [hideShorts, setHideShorts] = useState(() => getInitialState("hideShorts", false));
  const [hideObscure, setHideObscure] = useState(() => getInitialState("hideObscure", true));
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState(() => {
    const initial = getInitialState("sortBy", "date");
    return initial === "popularity" ? "date" : initial;
  });

  useEffect(() => {
    localStorage.setItem("showOnlyRated", JSON.stringify(showOnlyRated));
    localStorage.setItem("hideDocumentaries", JSON.stringify(hideDocumentaries));
    localStorage.setItem("hideShorts", JSON.stringify(hideShorts));
    localStorage.setItem("hideObscure", JSON.stringify(hideObscure));
    localStorage.setItem("sortBy", JSON.stringify(sortBy));
  }, [showOnlyRated, hideDocumentaries, hideShorts, hideObscure, sortBy]);

  const API_URL = import.meta.env.VITE_API_URL || "";
  const decodedName = decodeURIComponent(name);
  const { toast } = useToast();

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
      toast("Errore durante il salvataggio.", "error");
    }
  };

  const sortOptions = [
    { key: "date",       label: "Data",       icon: <FiCalendar size={13} /> },
    { key: "vote_count", label: "Voti",        icon: <FiAward size={13} /> },
    { key: "revenue",    label: "Box Office",  icon: <FiTrendingUp size={13} /> },
  ];

  const filterMovies = (list) => {
    let filtered = [...list];
    if (showOnlyRated) {
      filtered = filtered.filter((m) => m.vote_count && m.vote_count > 0 && m.vote_average && m.vote_average > 0);
    }
    if (hideDocumentaries) {
      filtered = filtered.filter((m) => !m.genre_ids?.includes(99));
    }
    if (hideObscure) {
      filtered = filtered.filter((m) => {
        // Filter out TV shows by genre: News (10763), Reality (10764), Soap (10766), Talk (10767)
        if (m.genre_ids?.some(id => [10763, 10764, 10766, 10767].includes(id))) return false;

        const char = (m.character || "").toLowerCase();
        const title = (m.title || "").toLowerCase();
        const badRoleKeywords = [
          "sconosciuto", "unknown", "uncredited", "non accreditato", "uncredited role",
          "himself", "herself", "self", "se stesso", "se stessa",
          "host", "presenter", "presentatore", "guest", "ospite", "narrator", "narratore",
          "cameo", "extra", "background", "audience", "archive"
        ];
        if (badRoleKeywords.some(w =>
          char === w || char.startsWith(w + " ") || char.endsWith(" " + w) ||
          char.includes("(" + w + ")") || char === "guest star"
        )) return false;

        const currentYear = new Date().getFullYear();
        const releaseYear = m.release_date ? new Date(m.release_date).getFullYear() : null;
        const isRecent = releaseYear && releaseYear >= currentYear - 1;
        const hasNoVotes = !m.vote_count || m.vote_count === 0;
        const isVeryLowPopularity = m.popularity !== undefined && m.popularity < 1.5;
        if (hasNoVotes && isVeryLowPopularity && !isRecent) return false;

        const badTitleKeywords = [
          "the tonight show", "jimmy kimmel", "late night", "live with",
          "the oscars", "academy awards", "golden globe", "behind the scenes",
          "entertainment tonight", "the late late show"
        ];
        if (badTitleKeywords.some(w => title.includes(w))) return false;
        return true;
      });
    }
    if (hideShorts) {
      filtered = filtered.filter((m) => !m.is_short);
    }
    if (sortBy === "revenue") {
      filtered.sort((a, b) => (a.revenue_rank || 10000) - (b.revenue_rank || 10000));
    } else if (sortBy === "vote_count") {
      filtered.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    } else {
      filtered.sort((a, b) => {
        const dateA = a.release_date ? new Date(a.release_date) : new Date(0);
        const dateB = b.release_date ? new Date(b.release_date) : new Date(0);
        return dateB - dateA;
      });
    }
    return filtered;
  };

  const directedMovies  = data?.directed   ? filterMovies(data.directed)   : [];
  const actedMovies     = data?.acted      ? filterMovies(data.acted)      : [];
  const directedTvMovies= data?.directedTv ? filterMovies(data.directedTv) : [];
  const actedTvMovies   = data?.actedTv    ? filterMovies(data.actedTv)    : [];

  const hasDirected   = directedMovies.length > 0;
  const hasActed      = actedMovies.length > 0;
  const hasDirectedTv = directedTvMovies.length > 0;
  const hasActedTv    = actedTvMovies.length > 0;

  if (loading) return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {Array.from({ length: 12 }).map((_, i) => <SkeletonMovieCard key={i} />)}
      </div>
    </div>
  );
  if (!data) return <div className={styles.error}>Nessun dato trovato per "{decodedName}".</div>;

  const getInitials = (fullName) => {
    if (!fullName) return "";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getRoleLabel = () => {
    const roles = [];
    if (data.directed?.length > 0 || data.directedTv?.length > 0) roles.push("Regista");
    if (data.acted?.length > 0 || data.actedTv?.length > 0) roles.push("Attore");
    if (roles.length === 0) return "Talento Cinema & TV";
    return roles.join(" · ").toUpperCase();
  };

  const initials  = getInitials(data.personName);
  const roleLabel = getRoleLabel();

  const cardVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1 }
  };

  const realFilterOptions = [
    { label: "Nascondi film senza voto",        checked: showOnlyRated,      setter: setShowOnlyRated },
    { label: "Nascondi Documentari",             checked: hideDocumentaries,  setter: setHideDocumentaries },
    { label: "Nascondi cortometraggi",           checked: hideShorts,         setter: setHideShorts },
    { label: "Nascondi film minori / talk-show", checked: hideObscure,        setter: setHideObscure },
  ];

  return (
    <div className={styles.container}>

      {/* Ambient backdrop */}
      {data.profile_path && (
        <div
          className={styles.dynamicBackdrop}
          style={{ backgroundImage: `url(https://image.tmdb.org/t/p/w300${data.profile_path})` }}
        />
      )}

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <div className={styles.heroCanvas}>

        {/* Background initials watermark */}
        {initials && (
          <div className={styles.heroMonogram} aria-hidden="true">{initials}</div>
        )}

        {/* Portrait — top-left, stretches vertically to match info height */}
        <div className={styles.imageWrapper}>
          <img
            src={data.profile_path
              ? `https://image.tmdb.org/t/p/w500${data.profile_path}`
              : "https://placehold.co/300x450/111113/333?text=—"}
            alt={data.personName}
            className={styles.personImage}
            loading="eager"
            decoding="async"
          />
        </div>

        {/* Info panel — role, name, stats, save */}
        <div className={styles.personInfo}>

          <div className={styles.metaRow}>
            <span className={styles.roleBadge}>{roleLabel}</span>
          </div>

          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>{data.personName}</h1>
            {loggedInUserId && (
              <button
                className={`${styles.savePersonBtn} ${isSaved ? styles.saved : ""}`}
                onClick={handleToggleSave}
                title={isSaved ? "Rimuovi dai salvati" : "Salva talento"}
                aria-label={isSaved ? "Rimuovi dai salvati" : "Salva talento"}
              >
                {isSaved ? <FaBookmark size={13} /> : <FiBookmark size={13} />}
                <span className={styles.saveBtnText}>{isSaved ? "Salvato" : "Salva"}</span>
              </button>
            )}
          </div>

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
          </div>

        </div>

        {/* Biography — spans full width as second row of the grid */}
        <div className={styles.biographySection}>
          {data.biography ? (
            <>
              <p className={styles.biographyTitle}>Biografia</p>
              <motion.div
                className={styles.biographyTextContainer}
                initial={false}
                animate={{ height: isBioExpanded ? "auto" : "84px" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                style={{ overflow: "hidden", position: "relative" }}
              >
                <p className={styles.biographyText}>{data.biography}</p>
                {!isBioExpanded && data.biography.length > 200 && (
                  <div className={styles.bioOverlay} />
                )}
              </motion.div>
              {data.biography.length > 200 && (
                <button
                  className={styles.toggleBioButton}
                  onClick={() => setIsBioExpanded(!isBioExpanded)}
                >
                  {isBioExpanded ? "Mostra meno ↑" : "Continua a leggere ↓"}
                </button>
              )}
            </>
          ) : (
            <p className={styles.biographyText} style={{ opacity: 0.32 }}>
              Nessuna biografia disponibile su TMDB.
            </p>
          )}
        </div>

      </div>

      {/* ── TOOLBAR ─────────────────────────────────────────────────────── */}
      <div className={styles.controlsRow}>

        {/* Sort pills (segmented control style) */}
        <div className={styles.sortSegment}>
          {sortOptions.map(opt => (
            <button
              key={opt.key}
              className={`${styles.segmentBtn} ${sortBy === opt.key ? styles.segmentActive : ""}`}
              onClick={() => setSortBy(opt.key)}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>

        {/* Filter button + dropdown */}
        <div className={styles.filterWrap}>
          <button
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            className={`${styles.filterButton} ${showFilterDropdown ? styles.activeFilterBtn : ""}`}
            aria-expanded={showFilterDropdown}
          >
            <FiSliders size={14} />
            Filtri
            {showFilterDropdown ? " ▲" : " ▼"}
          </button>

          <AnimatePresence>
            {showFilterDropdown && (
              <motion.div
                className={styles.filterDropdown}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                {realFilterOptions.map((option, index) => (
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
      </div>

      {/* ── EMPTY STATE ─────────────────────────────────────────────────── */}
      {!hasDirected && !hasActed && !hasDirectedTv && !hasActedTv && (
        <p className={styles.emptyMsg}>Nessun contenuto corrisponde ai filtri selezionati.</p>
      )}

      {/* ── FILM SECTIONS ───────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        <div className={styles.sectionsContainer}>

          {[
            { show: hasDirected,   title: `Regia — Cinema`,    movies: directedMovies,   prefix: "mov-dir" },
            { show: hasActed,      title: `Cast — Cinema`,     movies: actedMovies,      prefix: "mov-act" },
            { show: hasDirectedTv, title: `Regia — Serie TV`,  movies: directedTvMovies, prefix: "tv-dir"  },
            { show: hasActedTv,    title: `Cast — Serie TV`,   movies: actedTvMovies,    prefix: "tv-act"  },
          ].map(({ show, title, movies, prefix }, si) =>
            show && (
              <motion.section
                key={prefix}
                className={styles.section}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, delay: si * 0.08 }}
              >
                <h2 className={styles.sectionTitle}>
                  {title}
                  <span className={styles.sectionCount}>{movies.length}</span>
                </h2>
                <motion.div
                  className={styles.grid}
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: { opacity: 1, transition: { staggerChildren: 0.018 } }
                  }}
                >
                  {movies.map((movie, index) => (
                    <motion.div
                      key={`${prefix}-${movie._id}-${index}`}
                      className={styles.cardWrapper}
                      variants={cardVariants}
                      transition={{ type: "spring", stiffness: 220, damping: 22 }}
                    >
                      <MovieCard movie={movie} />
                    </motion.div>
                  ))}
                </motion.div>
              </motion.section>
            )
          )}

        </div>
      </AnimatePresence>

      {/* ── ULTIME NOTIZIE ── */}
      <div className={styles.newsSection}>
        <h2 className={styles.sectionTitle}>Ultime Notizie</h2>
        
        {!news && !loadingNews && (
          <button className={styles.loadNewsBtn} onClick={handleLoadNews}>
            Carica Ultime Notizie su {data.personName}
          </button>
        )}
        
        {loadingNews && <p>Caricamento notizie in corso...</p>}
        {newsError && <p className={styles.error}>{newsError}</p>}
        
        {news && news.length > 0 && (
          <div className={styles.newsGrid}>
            {news.map((article, idx) => (
              <a key={idx} href={article.url} target="_blank" rel="noopener noreferrer" className={styles.newsCard}>
                {article.urlToImage && (
                  <img src={article.urlToImage} alt="News thumbnail" className={styles.newsImg} loading="lazy" />
                )}
                <div className={styles.newsContent}>
                  <p className={styles.newsDate}>{new Date(article.publishedAt).toLocaleDateString("it-IT")}</p>
                  <h3 className={styles.newsTitle}>{article.title}</h3>
                  <p className={styles.newsSource}>{article.source?.name}</p>
                </div>
              </a>
            ))}
          </div>
        )}
        {news && news.length === 0 && <p>Nessuna notizia recente trovata.</p>}
      </div>

    </div>
  );
}

export default PersonPage;