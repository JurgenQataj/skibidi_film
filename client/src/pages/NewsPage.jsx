import React, { useState, useEffect, useCallback } from "react";
import styles from "./NewsPage.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const PAGE_SIZE = 12;

// Formatta la data in formato leggibile in italiano
function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Stub per gli skeleton di caricamento
function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonImage} />
      <div className={styles.skeletonBody}>
        <div className={styles.skeletonLine} style={{ width: "40%" }} />
        <div className={styles.skeletonLine} style={{ width: "90%" }} />
        <div className={styles.skeletonLine} style={{ width: "75%" }} />
        <div className={styles.skeletonLine} style={{ width: "55%", marginTop: 12 }} />
      </div>
    </div>
  );
}

// Card articolo normale
function NewsCard({ article }) {
  const hasImage = article.urlToImage && !article.urlToImage.includes("placeholder");
  const source = article.source?.name || "Fonte sconosciuta";

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      {hasImage ? (
        <div className={styles.cardImageWrapper}>
          <img
            src={article.urlToImage}
            alt={article.title}
            className={styles.cardImage}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.parentElement.style.display = "none";
            }}
          />
          <div className={styles.cardImageOverlay} />
        </div>
      ) : (
        <div className={styles.cardImagePlaceholder}>
          <span>🎬</span>
        </div>
      )}

      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span className={styles.cardSource}>{source}</span>
          <span className={styles.cardDot}>·</span>
          <span className={styles.cardDate}>{formatDate(article.publishedAt)}</span>
        </div>
        <h3 className={styles.cardTitle}>{article.title}</h3>
        {article.description && (
          <p className={styles.cardDesc}>{article.description}</p>
        )}
        <span className={styles.readMore}>Leggi l'articolo →</span>
      </div>
    </a>
  );
}



export default function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState("publishedAt"); // "publishedAt" | "popularity"

  const fetchNews = useCallback(async (pageNum, sortParam) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      const params = new URLSearchParams({
        pageSize: PAGE_SIZE,
        page: pageNum,
        sortBy: sortParam,
      });

      const res = await fetch(`${API_URL}/api/news?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      // Filtra articoli senza titolo o con "[Removed]"
      const clean = (data.articles || []).filter(
        (a) => a.title && a.title !== "[Removed]" && a.url
      );

      setArticles((prev) => (pageNum === 1 ? clean : [...prev, ...clean]));
      // NewsAPI free tier limita a 100 risultati totali
      const totalFetched = pageNum * PAGE_SIZE;
      setHasMore(totalFetched < Math.min(data.totalResults || 0, 100) && clean.length === PAGE_SIZE);
    } catch (err) {
      console.error("NewsPage fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(1, sortBy);
  }, [fetchNews, sortBy]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNews(nextPage, sortBy);
  };

  const toggleSort = () => {
    setSortBy((prev) => (prev === "publishedAt" ? "popularity" : "publishedAt"));
    setPage(1);
    setArticles([]); // clear until loads
  };

  // ── LOADING INIZIALE
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>
              <span className={styles.pageTitleAccent}>🎬</span> Cinema & TV News
            </h1>
          </div>
          <p className={styles.pageSubtitle}>Le ultime notizie dal mondo del cinema e delle serie TV</p>
        </div>
        <div className={styles.skeletonHero} />
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── ERRORE
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            <span className={styles.pageTitleAccent}>🎬</span> Cinema & TV News
          </h1>
        </div>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <p>Impossibile caricare le notizie.</p>
          <p className={styles.errorDetail}>{error}</p>
          <button className={styles.retryBtn} onClick={() => fetchNews(1)}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  // ── VUOTO
  if (articles.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>
            <span className={styles.pageTitleAccent}>🎬</span> Cinema & TV News
          </h1>
        </div>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>📭</span>
          <p>Nessuna notizia trovata al momento.</p>
          <button className={styles.retryBtn} onClick={() => fetchNews(1)}>
            Riprova
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.pageTitle}>
            <span className={styles.pageTitleAccent}>🎬</span> Cinema & TV News
          </h1>
          
          <div className={styles.sortToggle}>
            <button 
              className={`${styles.sortBtn} ${sortBy === "publishedAt" ? styles.sortBtnActive : ""}`}
              onClick={() => sortBy !== "publishedAt" && toggleSort()}
            >
              🕒 Recenti
            </button>
            <button 
              className={`${styles.sortBtn} ${sortBy === "popularity" ? styles.sortBtnActive : ""}`}
              onClick={() => sortBy !== "popularity" && toggleSort()}
            >
              🔥 Popolari
            </button>
          </div>
        </div>

        <p className={styles.pageSubtitle}>
          Le ultime notizie dal mondo del cinema e delle serie TV
        </p>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {articles.map((article, i) => (
          <NewsCard key={`${article.url}-${i}`} article={article} />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className={styles.loadMoreWrapper}>
          <button
            className={styles.loadMoreBtn}
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <span className={styles.btnSpinner} />
            ) : (
              "Carica altre notizie"
            )}
          </button>
        </div>
      )}

      {!hasMore && articles.length > 0 && (
        <p className={styles.endText}>Hai letto tutte le notizie disponibili 🎬</p>
      )}
    </div>
  );
}
