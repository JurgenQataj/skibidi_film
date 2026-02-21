import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./SearchInput.module.css";
import { FaSearch } from "react-icons/fa";

const SearchInput = ({
  onMovieSelect,
  onSearch,
  placeholder = "Scrivi il titolo di un film...",
  preventNavigation = false,
  mode = "movie", // Default mode
}) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const navigate = useNavigate();

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL || "";

  // Fetch suggestions con debounce
  const fetchSuggestions = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(
        `${API_URL}/api/movies/suggestions?query=${encodeURIComponent(
          searchQuery
        )}&type=${mode}`
      );
      setSuggestions(response.data.results || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Errore nel recupero dei suggerimenti:", error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounce per le chiamate API
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Gestione input
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setActiveSuggestion(-1);
  };

  // Gestione submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setShowSuggestions(false);
      // Reindirizza alla pagina dei risultati di ricerca
      if (!preventNavigation) {
        navigate(`/search?query=${encodeURIComponent(query.trim())}`);
      }
      if (onSearch) {
        onSearch(query.trim());
      }
    }
  };

  // Selezione suggerimento
  const handleSuggestionClick = (movie) => {
    setQuery(movie.title);
    setShowSuggestions(false);
    
    if (onMovieSelect) {
      onMovieSelect(movie);
    } else {
      // Navigazione di default se non gestita dal genitore
      if (mode === "person") {
        navigate(`/person/${encodeURIComponent(movie.title)}`);
      } else {
        navigate(`/movie/${movie.id}`);
      }
    }
  };

  // Gestione tasti freccia e Enter
  const handleKeyDown = (e) => {
    switch (e.key) {
      case "ArrowDown":
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          setActiveSuggestion((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case "ArrowUp":
        if (showSuggestions && suggestions.length > 0) {
          e.preventDefault();
          setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : -1));
        }
        break;
      case "Enter":
        e.preventDefault();
        if (showSuggestions && activeSuggestion >= 0) {
          handleSuggestionClick(suggestions[activeSuggestion]);
        } else {
          handleSubmit(e);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setActiveSuggestion(-1);
        break;
    }
  };

  // Chiudi suggerimenti quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setActiveSuggestion(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <input
          ref={inputRef}
          type="text"
          className={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
        <button type="submit" className={styles.searchButton} title="Cerca">
          <FaSearch />
        </button>
      </form>

      {showSuggestions && (
        <ul ref={suggestionsRef} className={styles.suggestionsContainer}>
          {loading ? (
            <li className={styles.loadingItem}>Caricamento...</li>
          ) : suggestions.length > 0 ? (
            suggestions.map((movie, index) => (
              <li
                key={movie.id}
                className={`${styles.suggestionItem} ${
                  index === activeSuggestion ? styles.active : ""
                }`}
                onClick={() => handleSuggestionClick(movie)}
              >
                {movie.poster_path && (
                  <img
                    src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                    alt={movie.title}
                    className={styles.suggestionPoster}
                  />
                )}
                <div className={styles.suggestionInfo}>
                  <p className={styles.suggestionTitle}>{movie.title}</p>
                  {movie.release_date && (
                    <p className={styles.suggestionYear}>
                      {movie.release_date.substring(0, 4)}
                    </p>
                  )}
                </div>
              </li>
            ))
          ) : query.length >= 2 ? (
            <li className={styles.noResults}>Nessun risultato trovato</li>
          ) : null}
        </ul>
      )}
    </div>
  );
};

export default SearchInput;
