import React, { useState } from "react";
import axios from "axios";
import styles from "./SearchPage.module.css";
import MovieCard from "../components/MovieCard";

function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await axios.get(
        `${API_URL}/api/movies/search?query=${query}`
      );
      setResults(response.data.results);
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Cerca un Film</h1>
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Scrivi il titolo di un film..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className={styles.searchButton}>
          Cerca
        </button>
      </form>

      <div className={styles.resultsGrid}>
        {loading ? (
          <p>Caricamento...</p>
        ) : (
          results.map((movie) => <MovieCard key={movie.id} movie={movie} />)
        )}
      </div>
    </div>
  );
}

export default SearchPage;
