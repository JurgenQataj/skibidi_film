import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useParams } from "react-router-dom";
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard, SkeletonWithLogo } from "../components/Skeleton";
import SkibidiRoulette from "../components/SkibidiRoulette";
import RussianRoulette from "../components/RussianRoulette";
import CustomSelect from "../components/CustomSelect";
import { useToast } from "../context/ToastContext";
import ImportListModal from "../components/ImportListModal";
import { Download } from "lucide-react";
function getUserId(routeUserId) {
  try {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = jwtDecode(token);
      return routeUserId || decoded.user?.id || "default";
    }
  } catch (e) {}
  return routeUserId || "default";
}

function WatchlistPage() {
  const { userId: routeUserId } = useParams();
  const userIdKey = getUserId(routeUserId);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [isOwner, setIsOwner] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const API_URL = import.meta.env.VITE_API_URL || "";
  const { toast, confirm } = useToast();

  const [selectedGenres, setSelectedGenres] = useState(() => {
    try {
      const saved = sessionStorage.getItem(`watchlistSelectedGenres_${userIdKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedKeyword, setSelectedKeyword] = useState(() => {
    try {
      return sessionStorage.getItem(`watchlistSelectedKeyword_${userIdKey}`) || "";
    } catch (e) {
      return "";
    }
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [selectedType, setSelectedType] = useState(() => {
    try { return sessionStorage.getItem(`watchlistSelectedType_${userIdKey}`) || "all"; } catch (e) { return "all"; }
  });

  const [selectedRuntime, setSelectedRuntime] = useState(() => {
    try { return sessionStorage.getItem(`watchlistSelectedRuntime_${userIdKey}`) || "all"; } catch (e) { return "all"; }
  });
  
  const [sortBy, setSortBy] = useState(() => {
    try { return sessionStorage.getItem(`watchlistSortBy_${userIdKey}`) || "recent"; } catch (e) { return "recent"; }
  });

  const typeOptions = [
    { value: "all", name: "Tutti" },
    { value: "movie", name: "Film" },
    { value: "tv", name: "Serie TV" }
  ];

  const runtimeOptions = [
    { value: "all", name: "Tutte" },
    { value: "short", name: "Breve (< 90 min)" },
    { value: "medium", name: "Medio (90 - 120 min)" },
    { value: "long", name: "Lungo (120 - 180 min)" },
    { value: "epic", name: "Epico (> 180 min)" }
  ];

  const sortOptions = [
    { value: "recent", name: "Aggiunti di recente" },
    { value: "oldest", name: "Aggiunti prima" },
    { value: "rating_desc", name: "Voto TMDB" },
    { value: "imdb_desc", name: "Voto IMDb" },
    { value: "rotten_desc", name: "Rotten Tomatoes" },
    { value: "meta_desc", name: "Metacritic" },
    { value: "year_desc", name: "Anno (Nuovi prima)" },
    { value: "year_asc", name: "Anno (Vecchi prima)" },
  ];

  const availableGenres = useMemo(() => {
    const genresSet = new Set();
    watchlist.forEach((movie) => {
      if (movie.genres && Array.isArray(movie.genres)) {
        movie.genres.forEach((g) => genresSet.add(g));
      }
    });
    return Array.from(genresSet).sort();
  }, [watchlist]);

  const genreOptions = useMemo(() => {
    return availableGenres.map(genre => ({
      value: genre,
      name: genre
    }));
  }, [availableGenres]);

  const availableKeywords = useMemo(() => {
    const keywordsSet = new Set();
    watchlist.forEach((movie) => {
      if (movie.keywords && Array.isArray(movie.keywords)) {
        movie.keywords.forEach((k) => keywordsSet.add(k));
      }
    });
    return Array.from(keywordsSet).sort();
  }, [watchlist]);

  const filteredKeywords = useMemo(() => {
    if (!selectedKeyword) return availableKeywords;
    const lower = selectedKeyword.toLowerCase();
    return availableKeywords.filter(k => k.toLowerCase().includes(lower));
  }, [availableKeywords, selectedKeyword]);

  const filteredWatchlist = useMemo(() => {
    let result = watchlist.filter((movie) => {
      if (selectedType !== "all") {
        const type = movie.media_type || "movie";
        if (type !== selectedType) return false;
      }
      if (selectedGenres && selectedGenres.length > 0) {
        if (!movie.genres) return false;
        const hasAllGenres = selectedGenres.every((genre) => movie.genres.includes(genre));
        if (!hasAllGenres) return false;
      }
      if (selectedKeyword.trim() !== "") {
        if (!movie.keywords) return false;
        const lowerSearch = selectedKeyword.toLowerCase();
        const hasKeywordMatch = movie.keywords.some(k => k.toLowerCase().includes(lowerSearch));
        if (!hasKeywordMatch) return false;
      }
      if (selectedRuntime !== "all") {
        const rt = movie.runtime || 0;
        if (rt === 0) return false;
        if (selectedRuntime === "short" && rt >= 90) return false;
        if (selectedRuntime === "medium" && (rt < 90 || rt > 120)) return false;
        if (selectedRuntime === "long" && (rt <= 120 || rt > 180)) return false;
        if (selectedRuntime === "epic" && rt <= 180) return false;
      }
      return true;
    });

    const getImdb = (v) => {
      if (!v) return -1;
      const str = String(v).toUpperCase();
      if (str === "N/A" || str === "NULL") return -1;
      const num = parseFloat(str);
      return isNaN(num) ? -1 : num;
    };
    
    const getRotten = (v) => {
      if (!v) return -1;
      const str = String(v).toUpperCase();
      if (str === "N/A" || str === "NULL") return -1;
      const num = parseInt(str.replace("%", ""), 10);
      return isNaN(num) ? -1 : num;
    };

    const getMeta = (v) => {
      if (!v) return -1;
      const str = String(v).toUpperCase();
      if (str === "N/A" || str === "NULL") return -1;
      const num = parseInt(str, 10);
      return isNaN(num) ? -1 : num;
    };

    if (sortBy === "rating_desc") {
      result.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
    } else if (sortBy === "imdb_desc") {
      result.sort((a, b) => getImdb(b.imdb_rating) - getImdb(a.imdb_rating));
    } else if (sortBy === "rotten_desc") {
      result.sort((a, b) => getRotten(b.rotten_tomatoes) - getRotten(a.rotten_tomatoes));
    } else if (sortBy === "meta_desc") {
      result.sort((a, b) => getMeta(b.metascore) - getMeta(a.metascore));
    } else if (sortBy === "year_desc") {
      result.sort((a, b) => (b.release_year || 0) - (a.release_year || 0));
    } else if (sortBy === "year_asc") {
      result.sort((a, b) => (a.release_year || 0) - (b.release_year || 0));
    } else if (sortBy === "recent") {
      result.reverse();
    }

    return result;
  }, [watchlist, selectedGenres, selectedKeyword, selectedType, sortBy, selectedRuntime]);

  const fetchWatchlist = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const decodedToken = jwtDecode(token);
      const currentUserId = decodedToken.user.id;
      const targetUserId = routeUserId || currentUserId;
      const ownerStatus = !routeUserId || routeUserId === currentUserId;
      setIsOwner(ownerStatus);

      if (ownerStatus) {
        setUsername(decodedToken.user.username || "Utente");
      } else {
        try {
          const profileRes = await axios.get(`${API_URL}/api/users/${targetUserId}/profile`);
          setUsername(profileRes.data.username);
        } catch (e) {
          setUsername("Utente");
        }
      }

      const response = await axios.get(
        `${API_URL}/api/watchlist/user/${targetUserId}`
      );
      setWatchlist(response.data);
    } catch (error) {
      console.error("Errore nel caricamento della watchlist:", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, routeUserId]);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`watchlistSelectedGenres_${userIdKey}`, JSON.stringify(selectedGenres));
    } catch (e) {}
  }, [selectedGenres, userIdKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(`watchlistSelectedKeyword_${userIdKey}`, selectedKeyword);
    } catch (e) {}
  }, [selectedKeyword, userIdKey]);

  useEffect(() => {
    try { sessionStorage.setItem(`watchlistSelectedType_${userIdKey}`, selectedType); } catch (e) {}
  }, [selectedType, userIdKey]);

  useEffect(() => {
    try { sessionStorage.setItem(`watchlistSelectedRuntime_${userIdKey}`, selectedRuntime); } catch (e) {}
  }, [selectedRuntime, userIdKey]);

  useEffect(() => {
    try { sessionStorage.setItem(`watchlistSortBy_${userIdKey}`, sortBy); } catch (e) {}
  }, [sortBy, userIdKey]);

  // Ripristina la posizione dello scroll PRIMA che il browser dipinga (nessun flash visivo)
  useLayoutEffect(() => {
    if (!loading && watchlist.length > 0) {
      try {
        const savedPosition = sessionStorage.getItem(`watchlistScrollPos_${userIdKey}`);
        if (savedPosition) {
          window.scrollTo({ top: parseInt(savedPosition, 10), behavior: "instant" });
          sessionStorage.removeItem(`watchlistScrollPos_${userIdKey}`);
        }
      } catch (e) {}
    }
  }, [loading, watchlist.length, userIdKey]);

  // *** CORREZIONE 1: Funzione per rimuovere un film dalla watchlist ***
  const handleRemoveFromWatchlist = async (tmdbId) => {
    const ok = await confirm("Sei sicuro di voler rimuovere questo film dalla watchlist?");
    if (!ok) return;
    try {
      const token = localStorage.getItem("token");
      const movieToRemove = watchlist.find(m => m.tmdb_id === tmdbId);
      const mediaType = movieToRemove?.media_type || "movie";
      
      await axios.delete(`${API_URL}/api/watchlist/${tmdbId}?mediaType=${mediaType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWatchlist((prev) => prev.filter((movie) => movie.tmdb_id !== tmdbId));
    } catch (error) {
      toast("Errore durante la rimozione del film.", "error");
    }
  };

  if (loading) return <SkeletonWithLogo />;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>
            <span><span className={styles.usernameHighlight}>{username}'s</span> Watchlist</span>
            <span className={styles.movieCountBadge}>{watchlist.length} Film</span>
          </h1>
          {isOwner && (
            <button 
              className={styles.importListBtn} 
              onClick={() => setIsImportModalOpen(true)}
            >
              <Download size={16} />
              Importa da altre Liste
            </button>
          )}
        </div>
      </header>

      <div className={styles.filterContainer}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Tipo:</label>
          <CustomSelect 
            options={typeOptions}
            value={selectedType} 
            onChange={setSelectedType}
            placeholder="Tutti"
            multiple={false}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Generi:</label>
          <CustomSelect 
            options={genreOptions}
            value={selectedGenres} 
            onChange={setSelectedGenres}
            placeholder="Tutti i generi"
            multiple={true}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Ordina per:</label>
          <CustomSelect 
            options={sortOptions}
            value={sortBy} 
            onChange={setSortBy}
            placeholder="Aggiunti di recente"
            multiple={false}
          />
        </div>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Durata:</label>
          <CustomSelect 
            options={runtimeOptions}
            value={selectedRuntime} 
            onChange={setSelectedRuntime}
            placeholder="Tutte"
            multiple={false}
          />
        </div>
        <div className={styles.filterGroup} style={{ position: 'relative' }}>
          <label htmlFor="keywordSearch" className={styles.filterLabel}>Parola chiave:</label>
          <input 
            id="keywordSearch"
            type="text" 
            placeholder="Cerca o scegli..." 
            value={selectedKeyword}
            onChange={(e) => {
              setSelectedKeyword(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setShowSuggestions(false)}
            className={styles.filterInput}
            autoComplete="off"
          />
          {showSuggestions && (
            <ul className={styles.suggestionsList}>
              {filteredKeywords.length > 0 ? (
                filteredKeywords.map(keyword => (
                  <li 
                    key={keyword} 
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedKeyword(keyword);
                      setShowSuggestions(false);
                    }}
                    className={styles.suggestionItem}
                  >
                    {keyword}
                  </li>
                ))
              ) : (
                <li className={styles.suggestionItemDisabled}>Nessuna parola chiave</li>
              )}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.reviewsGrid}>
        {filteredWatchlist.length > 0 ? (
          filteredWatchlist.map((movie) => (
            <div
              key={movie.tmdb_id}
              className={styles.cardWrapper}
            >
              <MovieCard
                movie={movie}
                showDeleteButton={isOwner}
                sortBy={sortBy}
                onDelete={handleRemoveFromWatchlist}
                onBeforeNavigate={() => {
                  try {
                    sessionStorage.setItem(`watchlistScrollPos_${userIdKey}`, window.scrollY);
                  } catch (e) {}
                }}
              />
            </div>
          ))
        ) : (
          <p className={styles.statusText}>Nessun film trovato con questi filtri o watchlist vuota.</p>
        )}
      </div>

      <RussianRoulette watchlist={watchlist} />
      <SkibidiRoulette watchlist={watchlist} />

      <ImportListModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        targetListId="watchlist"
        onSuccess={fetchWatchlist}
      />
    </div>
  );
}

export default WatchlistPage;
