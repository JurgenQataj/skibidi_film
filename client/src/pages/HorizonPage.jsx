import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./HorizonPage.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";
const IMG_BASE = "https://image.tmdb.org/t/p/w1280";

// Genera un ID univoco per ogni player
let playerIdCounter = 0;
const getPlayerId = () => `ytplayer_${++playerIdCounter}`;

function HorizonCard({ movie, isActive }) {
  const iframeRef = useRef(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [wlLoading, setWlLoading] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const playerId = useRef(getPlayerId()).current;

  // Controllo stato watchlist
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

  // Quando la card diventa attiva, avvia il player; quando non è più attiva, fermalo
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (isActive) {
      // Forza ricarica dell'iframe per avviare il video
      const src = `https://www.youtube.com/embed/${movie.trailer_key}?autoplay=1&mute=1&controls=0&loop=1&playlist=${movie.trailer_key}&rel=0&modestbranding=1&playsinline=1`;
      if (iframe.src !== src) {
        iframe.src = src;
      }
    } else {
      // Ferma il video azzerando src
      iframe.src = "";
    }
  }, [isActive, movie.trailer_key]);

  const toggleWatchlist = async () => {
    if (!token || wlLoading) return;
    setWlLoading(true);
    try {
      if (inWatchlist) {
        await axios.delete(
          `${API_URL}/api/watchlist/${movie.id}?mediaType=movie`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setInWatchlist(false);
      } else {
        await axios.post(
          `${API_URL}/api/watchlist`,
          {
            tmdb_id: movie.id,
            title: movie.title,
            poster_path: movie.poster_path,
            media_type: "movie",
          },
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
      {/* Video Background */}
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
        {/* Poster visibile finché il video non è pronto */}
        {movie.backdrop_path && (
          <img
            className={`${styles.posterFallback} ${isActive ? styles.hidden : ""}`}
            src={`${IMG_BASE}${movie.backdrop_path}`}
            alt={movie.title}
          />
        )}
      </div>

      {/* Overlay gradiente */}
      <div className={styles.overlay} />

      {/* Info film in basso */}
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
          <button
            className={styles.moreBtn}
            onClick={() => setShowInfo((s) => !s)}
          >
            {showInfo ? "Meno ▲" : "Leggi di più ▼"}
          </button>
        )}
      </div>

      {/* Pulsanti azione laterali */}
      <div className={styles.actions}>
        <button
          className={`${styles.actionBtn} ${inWatchlist ? styles.actionBtnActive : ""}`}
          onClick={toggleWatchlist}
          disabled={wlLoading}
          title={inWatchlist ? "Rimuovi dalla Watchlist" : "Aggiungi alla Watchlist"}
        >
          <span className={styles.actionIcon}>{inWatchlist ? "✅" : "➕"}</span>
          <span className={styles.actionLabel}>
            {inWatchlist ? "Salvato" : "Watchlist"}
          </span>
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

      {/* Brand logo */}
      <div className={styles.brandTag}>
        <span className={styles.brandIcon}>📱</span>
        <span>Skibidi Horizon</span>
      </div>
    </div>
  );
}

function HorizonPage() {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const cardRefs = useRef([]);

  const fetchMovies = useCallback(
    async (pageNum) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const res = await axios.get(`${API_URL}/api/movies/horizon?page=${pageNum}`);
        const data = res.data;
        setMovies((prev) =>
          pageNum === 1 ? data.results : [...prev, ...data.results]
        );
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

  useEffect(() => {
    fetchMovies(1);
  }, [fetchMovies]);

  // IntersectionObserver per rilevare la card visibile
  useEffect(() => {
    if (movies.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.index, 10);
            setActiveIndex(idx);

            // Carica più film quando si avvicina alla fine
            if (idx >= movies.length - 2 && hasMore && !loadingMore) {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchMovies(nextPage);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: 0.7,
      }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, [movies, hasMore, loadingMore, page, fetchMovies]);

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
        <p className={styles.loadingText}>Nessun film disponibile al momento.</p>
      </div>
    );
  }

  return (
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
  );
}

export default HorizonPage;
