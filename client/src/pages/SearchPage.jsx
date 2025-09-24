import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./SearchPage.module.css";
import MovieCard from "../components/MovieCard";
import SearchInput from "../components/SearchInput";

function SearchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || "";

  // Gestione ricerca completa
  const handleSearch = async (query) => {
    if (!query) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const response = await axios.get(
        `${API_URL}/api/movies/search?query=${encodeURIComponent(query)}`
      );
      setResults(response.data.results || []);
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Gestione selezione da suggerimenti
  const handleMovieSelect = (movie) => {
    // Naviga direttamente alla pagina del film
    navigate(`/movie/${movie.id}`);
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Cerca un Film</h1>

      <div className={styles.searchSection}>
        <SearchInput
          onSearch={handleSearch}
          onMovieSelect={handleMovieSelect}
          placeholder="Scrivi il titolo di un film..."
        />
      </div>

      {loading && (
        <div className={styles.loading}>
          <p>Caricamento...</p>
        </div>
      )}

      {hasSearched && !loading && (
        <div className={styles.resultsSection}>
          {results.length > 0 ? (
            <>
              <h2 className={styles.resultsTitle}>
                Trovati {results.length} risultati
              </h2>
              <div className={styles.resultsGrid}>
                {results.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            </>
          ) : (
            <div className={styles.noResults}>
              <p>Nessun film trovato. Prova con un altro termine di ricerca.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
