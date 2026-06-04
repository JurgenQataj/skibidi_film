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
  const API_URL = import.meta.env.VITE_API_URL || "";

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
    return watchlist.filter((movie) => {
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
      return true;
    });
  }, [watchlist, selectedGenres, selectedKeyword]);

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
    if (
      !window.confirm(
        "Sei sicuro di voler rimuovere questo film dalla watchlist?"
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      const movieToRemove = watchlist.find(m => m.tmdb_id === tmdbId);
      const mediaType = movieToRemove?.media_type || "movie";
      
      await axios.delete(`${API_URL}/api/watchlist/${tmdbId}?mediaType=${mediaType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Aggiorna lo stato per rimuovere il film senza ricaricare la pagina
      setWatchlist((prev) => prev.filter((movie) => movie.tmdb_id !== tmdbId));
    } catch (error) {
      alert("Errore durante la rimozione del film.");
    }
  };

  if (loading) return <SkeletonWithLogo />;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <span><span className={styles.usernameHighlight}>{username}'s</span> Watchlist</span>
          <span className={styles.movieCountBadge}>{watchlist.length} Film</span>
        </h1>
      </header>

      <div className={styles.filterContainer}>
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
    </div>
  );
}

export default WatchlistPage;
