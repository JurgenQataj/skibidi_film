import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useParams } from "react-router-dom";
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard, SkeletonWithLogo } from "../components/Skeleton";
import SkibidiRoulette from "../components/SkibidiRoulette";
import RussianRoulette from "../components/RussianRoulette";

function WatchlistPage() {
  const { userId: routeUserId } = useParams();
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [isOwner, setIsOwner] = useState(true);
  const API_URL = import.meta.env.VITE_API_URL || "";

  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedKeyword, setSelectedKeyword] = useState("");
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
      if (selectedGenre && (!movie.genres || !movie.genres.includes(selectedGenre))) {
        return false;
      }
      if (selectedKeyword.trim() !== "") {
        if (!movie.keywords) return false;
        const lowerSearch = selectedKeyword.toLowerCase();
        const hasKeywordMatch = movie.keywords.some(k => k.toLowerCase().includes(lowerSearch));
        if (!hasKeywordMatch) return false;
      }
      return true;
    });
  }, [watchlist, selectedGenre, selectedKeyword]);

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

  // Ripristina la posizione dello scroll PRIMA che il browser dipinga (nessun flash visivo)
  useLayoutEffect(() => {
    if (!loading && watchlist.length > 0) {
      const savedPosition = sessionStorage.getItem("watchlistScrollPos");
      if (savedPosition) {
        window.scrollTo({ top: parseInt(savedPosition, 10), behavior: "instant" });
        sessionStorage.removeItem("watchlistScrollPos");
      }
    }
  }, [loading, watchlist.length]);

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
          <label htmlFor="genreFilter" className={styles.filterLabel}>Genere:</label>
          <select 
            id="genreFilter"
            value={selectedGenre} 
            onChange={(e) => setSelectedGenre(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Tutti i generi</option>
            {availableGenres.map(genre => (
              <option key={genre} value={genre}>{genre}</option>
            ))}
          </select>
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
                onBeforeNavigate={() => sessionStorage.setItem("watchlistScrollPos", window.scrollY)}
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
