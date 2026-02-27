import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./HorizonPage.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";
const IMG_BASE = "https://image.tmdb.org/t/p/w1280";

// Generi film TMDB
const GENRES = [
  { id: 28, name: "Azione" },
  { id: 12, name: "Avventura" },
  { id: 16, name: "Animazione" },
  { id: 35, name: "Commedia" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentario" },
  { id: 18, name: "Dramma" },
  { id: 10751, name: "Famiglia" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "Storia" },
  { id: 27, name: "Horror" },
  { id: 9648, name: "Mistero" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Fantascienza" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "Guerra" },
  { id: 37, name: "Western" },
];

const CURRENT_YEAR = new Date().getFullYear();

// Genera un ID univoco per ogni player
let playerIdCounter = 0;
const getPlayerId = () => `ytplayer_${++playerIdCounter}`;

// ─── HorizonCard ──────────────────────────────────────────
function HorizonCard({ movie, isActive }) {
  const iframeRef = useRef(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [wlLoading, setWlLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const playerId = useRef(getPlayerId()).current;

  useEffect(() => {
    if (!token || !movie?.id) return;
    const check = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/watchlist/status/${movie.id}?mediaType=movie`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setInWatchlist(res.data.inWatchlist);
      } catch (_) {}
    };
    check();
  }, [movie?.id, token]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (isActive) {
      const src = `https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=0&controls=0&loop=1&playlist=${movie.trailer_key}&rel=0&modestbranding=1&playsinline=1`;
      if (iframe.src !== src) iframe.src = src;
    } else {
      iframe.src = "";
    }
  }, [isActive, movie.trailer_key]);

  const toggleWatchlist = async () => {
    if (!token || wlLoading) return;
    setWlLoading(true);
    try {
      if (inWatchlist) {
        await axios.delete(`${API_URL}/api/watchlist/${movie.id}?mediaType=movie`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setInWatchlist(false);
      } else {
        await axios.post(
          `${API_URL}/api/watchlist`,
          { tmdbId: movie.id, title: movie.title, poster_path: movie.poster_path, media_type: "movie" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setInWatchlist(true);
      }
    } catch (e) {
      console.error("Watchlist error:", e);
    } finally {
      setWlLoading(false);
    }
  };

  const year = movie.release_date ? movie.release_date.slice(0, 4) : "";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "N/A";

  return (
    <div className={styles.card}>
      <div className={styles.videoWrapper}>
        <iframe
          ref={iframeRef}
          id={playerId}
          className={styles.videoIframe}
          src=""
          title={movie.title}
          allow="autoplay; encrypted-media"
          allowFullScreen
          frameBorder="0"
        />
        {movie.backdrop_path && (
          <img
            className={`${styles.posterFallback} ${isActive ? styles.hidden : ""}`}
            src={`${IMG_BASE}${movie.backdrop_path}`}
            alt={movie.title}
          />
        )}
      </div>

      <div className={styles.overlay} />

      <div className={styles.infoBar}>
        <div className={styles.metaBadges}>
          <span className={styles.badge}>⭐ {rating}</span>
          {year && <span className={styles.badge}>{year}</span>}
        </div>
        <h2 className={styles.movieTitle}>{movie.title}</h2>
        <p className={`${styles.overview} ${showInfo ? styles.overviewExpanded : ""}`}>
          {movie.overview || "Nessuna descrizione disponibile."}
        </p>
        {movie.overview && (
          <button className={styles.moreBtn} onClick={() => setShowInfo((s) => !s)}>
            {showInfo ? "Meno ▲" : "Leggi di più ▼"}
          </button>
        )}
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${inWatchlist ? styles.actionBtnActive : ""}`}
          onClick={toggleWatchlist}
          disabled={wlLoading}
          title={inWatchlist ? "Rimuovi dalla Watchlist" : "Aggiungi alla Watchlist"}
        >
          <span className={styles.actionIcon}>{inWatchlist ? "✅" : "➕"}</span>
          <span className={styles.actionLabel}>{inWatchlist ? "Salvato" : "Watchlist"}</span>
        </button>

        <button
          className={styles.actionBtn}
          onClick={() => navigate(`/movie/${movie.id}`)}
          title="Vai al film"
        >
          <span className={styles.actionIcon}>🎬</span>
          <span className={styles.actionLabel}>Dettagli</span>
        </button>
      </div>

      <div className={styles.brandTag}>
        <span className={styles.brandIcon}>📱</span>
        <span>Skibidi Horizon</span>
      </div>
    </div>
  );
}

// ─── HorizonPage ─────────────────────────────────────────
function HorizonPage() {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const cardRefs = useRef([]);

  // ── Filtri ────────────────────────────────────────────
  const [showCustomizer, setShowCustomizer] = useState(false);
  const customizerRef = useRef(null);

  const [selectedGenre, setSelectedGenre] = useState(() => {
    try { return JSON.parse(localStorage.getItem("horizon_genre")) || null; }
    catch { return null; }
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    try { return localStorage.getItem("horizon_year") || ""; }
    catch { return ""; }
  });
  const [yearInput, setYearInput] = useState(selectedYear);
  const [yearTyping, setYearTyping] = useState(false); // feedback visivo mentre debounce

  const hasActiveFilters = !!(selectedGenre || selectedYear);

  // ── Auto-apply anno con debounce 700ms ────────────────
  useEffect(() => {
    const y = yearInput.trim();
    const yearNum = parseInt(y);
    const valid = y === "" || (!isNaN(yearNum) && yearNum >= 1900 && yearNum <= CURRENT_YEAR && y.length === 4);
    if (!valid) return; // non triggerare per anni parziali (es. "19", "200")

    setYearTyping(true);
    const timer = setTimeout(() => {
      setYearTyping(false);
      setSelectedYear(y);
      localStorage.setItem("horizon_year", y);
      setPage(1);
      setMovies([]);
      setHasMore(true);
    }, 700);

    return () => {
      clearTimeout(timer);
      setYearTyping(false);
    };
  }, [yearInput]);

  const resetFilters = () => {
    setSelectedGenre(null);
    setSelectedYear("");
    setYearInput("");
    localStorage.removeItem("horizon_year");
    localStorage.removeItem("horizon_genre");
    setPage(1);
    setMovies([]);
    setHasMore(true);
  };

  // ── Toggle genere (istantaneo) ────────────────────────
  const toggleGenre = (g) => {
    const next = selectedGenre?.id === g.id ? null : g;
    setSelectedGenre(next);
    localStorage.setItem("horizon_genre", JSON.stringify(next));
    setPage(1);
    setMovies([]);
    setHasMore(true);
  };

  // Chiudi pannello cliccando fuori
  useEffect(() => {
    const handleOutside = (e) => {
      if (customizerRef.current && !customizerRef.current.contains(e.target)) {
        setShowCustomizer(false);
      }
    };
    if (showCustomizer) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showCustomizer]);

  // ── Fetch ─────────────────────────────────────────────
  const fetchMovies = useCallback(
    async (pageNum, genre, year) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        let url = `${API_URL}/api/movies/horizon?page=${pageNum}`;
        if (year) url += `&year=${year}`;
        if (genre) url += `&genreId=${genre.id}`;

        const res = await axios.get(url);
        const data = res.data;
        setMovies((prev) => pageNum === 1 ? data.results : [...prev, ...data.results]);
        setHasMore(data.has_more);
      } catch (e) {
        console.error("Horizon fetch error:", e);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    []
  );

  // Fetch iniziale + quando cambiano i filtri
  useEffect(() => {
    setMovies([]);
    setPage(1);
    setHasMore(true);
    fetchMovies(1, selectedGenre, selectedYear);
  }, [selectedGenre, selectedYear, fetchMovies]);

  // Carica nuove pagine
  useEffect(() => {
    if (page > 1) fetchMovies(page, selectedGenre, selectedYear);
  }, [page]);

  // IntersectionObserver
  useEffect(() => {
    if (movies.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.index, 10);
            setActiveIndex(idx);
            if (idx >= movies.length - 2 && hasMore && !loadingMore) {
              setPage((p) => p + 1);
            }
          }
        });
      },
      { root: containerRef.current, threshold: 0.7 }
    );

    cardRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [movies, hasMore, loadingMore]);

  // ── Render ────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
        <p className={styles.loadingText}>Caricamento Horizon...</p>
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className={styles.loadingScreen}>
        <p className={styles.loadingText}>Nessun film trovato con questi filtri.</p>
        <button className={styles.resetBtn} onClick={resetFilters}>Rimuovi filtri</button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {/* ── Tasto personalizzazione ── */}
      <button
        className={`${styles.customizerTrigger} ${hasActiveFilters ? styles.customizerTriggerActive : ""}`}
        onClick={() => setShowCustomizer((v) => !v)}
        aria-label="Personalizza Horizon"
        title="Personalizza contenuti"
      >
        🎛️
        {hasActiveFilters && <span className={styles.filterDot} />}
      </button>

      {/* ── Pannello personalizzazione ── */}
      {showCustomizer && (
        <div className={styles.customizerPanel} ref={customizerRef}>
          <div className={styles.customizerHeader}>
            <span className={styles.customizerTitle}>🎛️ Personalizza Horizon</span>
            <button
              className={styles.customizerClose}
              onClick={() => setShowCustomizer(false)}
              aria-label="Chiudi"
            >✕</button>
          </div>

          {/* Anno */}
          <div className={styles.customizerSection}>
            <p className={styles.customizerLabel}>📅 Anno di uscita</p>
            <div className={styles.yearInputRow}>
              <input
                type="text"
                inputMode="numeric"
                className={`${styles.yearInput} ${yearTyping ? styles.yearInputTyping : ""}`}
                placeholder={`Es. 1994, 2007, 2021…`}
                maxLength={4}
                value={yearInput}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setYearInput(val);
                }}
              />
              {yearTyping && <span className={styles.yearSpinner} />}
              {yearInput && !yearTyping && (
                <button
                  className={styles.clearInputBtn}
                  onClick={() => {
                    setYearInput("");
                    setSelectedYear("");
                    localStorage.removeItem("horizon_year");
                    setPage(1); setMovies([]); setHasMore(true);
                  }}
                >✕</button>
              )}
            </div>
            {yearInput.length > 0 && yearInput.length < 4 && (
              <p className={styles.yearHint}>Scrivi 4 cifre per cercare (es. 1994)</p>
            )}
            {selectedYear && !yearTyping && (
              <p className={styles.yearConfirm}>✅ Trailer più popolari del {selectedYear}</p>
            )}
          </div>

          {/* Genere */}
          <div className={styles.customizerSection}>
            <p className={styles.customizerLabel}>🎬 Genere</p>
            <div className={styles.genreGrid}>
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  className={`${styles.genreChip} ${selectedGenre?.id === g.id ? styles.chipSelected : ""}`}
                  onClick={() => toggleGenre(g)}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.customizerFooter}>
            {hasActiveFilters && (
              <button className={styles.resetFiltersBtn} onClick={resetFilters}>
                Rimuovi tutti i filtri
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Scroll cards ── */}
      <div className={styles.container} ref={containerRef}>
        {movies.map((movie, idx) => (
          <div
            key={`${movie.id}-${idx}`}
            ref={(el) => (cardRefs.current[idx] = el)}
            data-index={idx}
            className={styles.cardContainer}
          >
            <HorizonCard movie={movie} isActive={idx === activeIndex} />
          </div>
        ))}

        {loadingMore && (
          <div className={styles.loadingMoreIndicator}>
            <div className={styles.loadingSpinner} />
          </div>
        )}
      </div>
    </div>
  );
}

export default HorizonPage;
