import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./SearchPage.module.css";
import MovieCard from "../components/MovieCard";
import SearchInput from "../components/SearchInput";

function SearchPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const navigate = useNavigate();

  // Stati per i filtri
  const [filters, setFilters] = useState({
    category: "popular",
    genre: "",
    releaseYear: {
      from: "",
      to: "",
    },
    minRating: 0,
    language: "",
    keywords: "",
  });

  // Lista generi come richiesta
  const genres = [
    { id: 16, name: "Animazione" },
    { id: 12, name: "Avventura" },
    { id: 28, name: "Azione" },
    { id: 35, name: "Commedia" },
    { id: 80, name: "Crime" },
    { id: 99, name: "Documentario" },
    { id: 18, name: "Dramma" },
    { id: 10751, name: "Famiglia" },
    { id: 878, name: "Fantascienza" },
    { id: 14, name: "Fantasy" },
    { id: 10752, name: "Guerra" },
    { id: 27, name: "Horror" },
    { id: 9648, name: "Mistero" },
    { id: 10402, name: "Musica" },
    { id: 10749, name: "Romance" },
    { id: 36, name: "Storia" },
    { id: 53, name: "Thriller" },
    { id: 37, name: "Western" },
    { id: 10770, name: "Televisione film" },
  ];

  // Lingue disponibili
  const languages = [
    { code: "it", name: "Italiano" },
    { code: "en", name: "Inglese" },
    { code: "fr", name: "Francese" },
    { code: "es", name: "Spagnolo" },
    { code: "de", name: "Tedesco" },
    { code: "ja", name: "Giapponese" },
    { code: "ko", name: "Coreano" },
    { code: "zh", name: "Cinese" },
  ];

  const API_URL = import.meta.env.VITE_API_URL || "";

  // Reset quando cambiano i filtri
  useEffect(() => {
    if (hasSearched) {
      console.log("*** FRONTEND DEBUG: Filtri cambiati ***", filters);
      setCurrentPage(1);
      setResults([]);
      performSearch(1, true);
    }
  }, [filters]);

  // Gestione ricerca con filtri
  const performSearch = async (page = 1, isNewSearch = false) => {
    console.log("*** FRONTEND DEBUG: Inizio ricerca ***", {
      page,
      isNewSearch,
      filters,
    });

    if (isNewSearch) {
      setLoading(true);
      setResults([]);
    } else {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams({
        category: filters.category,
        page: page.toString(),
        ...(filters.genre && { genre: filters.genre }),
        ...(filters.releaseYear.from && {
          release_date_gte: `${filters.releaseYear.from}-01-01`,
        }),
        ...(filters.releaseYear.to && {
          release_date_lte: `${filters.releaseYear.to}-12-31`,
        }),
        ...(filters.minRating > 0 && {
          vote_average_gte: filters.minRating.toString(),
        }),
        ...(filters.language && { with_original_language: filters.language }),
        ...(filters.keywords && { with_keywords: filters.keywords }),
      });

      console.log(
        "*** FRONTEND DEBUG: Parametri inviati ***",
        params.toString()
      );

      const response = await axios.get(
        `${API_URL}/api/movies/discover?${params.toString()}`
      );

      const newResults = response.data.results || [];

      console.log("*** FRONTEND DEBUG: Risposta ricevuta ***", {
        nuoviRisultati: newResults.length,
        primiTreFilm: newResults.slice(0, 3).map((m) => ({
          titolo: m.title,
          valutazione: m.vote_average,
        })),
      });

      if (isNewSearch) {
        console.log("*** FRONTEND: Sostituzione risultati completa ***");
        setResults(newResults);
      } else {
        console.log("*** FRONTEND: Aggiunta risultati ***");
        setResults((prev) => {
          const combined = [...prev, ...newResults];
          console.log("Risultati combinati:", combined.length);
          return combined;
        });
      }

      setTotalPages(response.data.total_pages || 0);
      setHasMore(page < (response.data.total_pages || 0));
      setCurrentPage(page);
    } catch (error) {
      console.error("*** FRONTEND ERROR ***", error);
      if (isNewSearch) {
        setResults([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Gestione ricerca tramite SearchInput (ricerca testuale)
  const handleSearch = async (query) => {
    if (!query) return;

    console.log("*** FRONTEND: Ricerca testuale ***", query);

    setLoading(true);
    setHasSearched(true);
    setCurrentPage(1);
    setResults([]);

    try {
      const response = await axios.get(
        `${API_URL}/api/movies/search?query=${encodeURIComponent(query)}`
      );
      const searchResults = response.data.results || [];
      setResults(searchResults);
      setTotalPages(response.data.total_pages || 0);
      setHasMore(1 < (response.data.total_pages || 0));

      // Reset filtri quando si fa una ricerca testuale
      setFilters({
        category: "popular",
        genre: "",
        releaseYear: { from: "", to: "" },
        minRating: 0,
        language: "",
        keywords: "",
      });
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Gestione selezione da suggerimenti
  const handleMovieSelect = (movie) => {
    navigate(`/movie/${movie.id}`);
  };

  // Gestione cambio filtri
  const handleFilterChange = (filterType, value) => {
    console.log("*** FRONTEND: Cambio filtro ***", { filterType, value });
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  // Gestione cambio anno
  const handleYearChange = (type, value) => {
    setFilters((prev) => ({
      ...prev,
      releaseYear: {
        ...prev.releaseYear,
        [type]: value,
      },
    }));
  };

  // Applica filtri
  const handleApplyFilters = () => {
    console.log("*** FRONTEND: Applica filtri cliccato ***", filters);
    setHasSearched(true);
    setCurrentPage(1);
    setResults([]);
    performSearch(1, true);
  };

  // Reset filtri
  const handleResetFilters = () => {
    console.log("*** FRONTEND: Reset filtri ***");
    setFilters({
      category: "popular",
      genre: "",
      releaseYear: { from: "", to: "" },
      minRating: 0,
      language: "",
      keywords: "",
    });
    setHasSearched(false);
    setResults([]);
    setCurrentPage(1);
    setHasMore(false);
  };

  // Carica altri risultati
  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      performSearch(currentPage + 1, false);
    }
  };

  return (
    <div className={styles.pageContainer}>
      <h1 className={styles.title}>Cerca Film</h1>

      <div className={styles.searchSection}>
        <SearchInput
          onSearch={handleSearch}
          onMovieSelect={handleMovieSelect}
          placeholder="Cerca per titolo..."
        />
      </div>

      {/* Sezione Filtri */}
      <div className={styles.filtersSection}>
        <h2 className={styles.filtersTitle}>Filtri di Ricerca</h2>

        {/* Categorie principali */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Categoria:</label>
          <div className={styles.categoryButtons}>
            <button
              className={`${styles.categoryBtn} ${
                filters.category === "popular" ? styles.active : ""
              }`}
              onClick={() => handleFilterChange("category", "popular")}
            >
              Film Popolari
            </button>
            <button
              className={`${styles.categoryBtn} ${
                filters.category === "now_playing" ? styles.active : ""
              }`}
              onClick={() => handleFilterChange("category", "now_playing")}
            >
              Film in Onda
            </button>
            <button
              className={`${styles.categoryBtn} ${
                filters.category === "top_rated" ? styles.active : ""
              }`}
              onClick={() => handleFilterChange("category", "top_rated")}
            >
              Film più Votati
            </button>
            <button
              className={`${styles.categoryBtn} ${
                filters.category === "upcoming" ? styles.active : ""
              }`}
              onClick={() => handleFilterChange("category", "upcoming")}
            >
              Film in Arrivo
            </button>
          </div>
        </div>

        {/* Genere */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="genre">
            Genere:
          </label>
          <select
            id="genre"
            className={styles.filterSelect}
            value={filters.genre}
            onChange={(e) => handleFilterChange("genre", e.target.value)}
          >
            <option value="">Tutti i generi</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>

        {/* Anno di pubblicazione */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Anno di Pubblicazione:</label>
          <div className={styles.yearInputs}>
            <input
              type="number"
              placeholder="Da (es: 2020)"
              className={styles.yearInput}
              value={filters.releaseYear.from}
              onChange={(e) => handleYearChange("from", e.target.value)}
              min="1900"
              max="2030"
            />
            <span className={styles.yearSeparator}>-</span>
            <input
              type="number"
              placeholder="A (es: 2024)"
              className={styles.yearInput}
              value={filters.releaseYear.to}
              onChange={(e) => handleYearChange("to", e.target.value)}
              min="1900"
              max="2030"
            />
          </div>
        </div>

        {/* *** VALUTAZIONE MINIMA *** */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="minRating">
            Valutazione Minima: {filters.minRating}/10
          </label>
          <input
            type="range"
            id="minRating"
            className={styles.voteSlider}
            min="0"
            max="10"
            step="0.5"
            value={filters.minRating}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value);
              console.log("*** FRONTEND: Slider cambiato ***", newValue);
              handleFilterChange("minRating", newValue);
            }}
          />
        </div>

        {/* Lingua */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="language">
            Lingua Originale:
          </label>
          <select
            id="language"
            className={styles.filterSelect}
            value={filters.language}
            onChange={(e) => handleFilterChange("language", e.target.value)}
          >
            <option value="">Tutte le lingue</option>
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Parole chiave */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel} htmlFor="keywords">
            Parole Chiave:
          </label>
          <input
            type="text"
            id="keywords"
            className={styles.keywordsInput}
            placeholder="es: superhero, space, comedy..."
            value={filters.keywords}
            onChange={(e) => handleFilterChange("keywords", e.target.value)}
          />
        </div>

        {/* Pulsanti azioni */}
        <div className={styles.filterActions}>
          <button className={styles.applyBtn} onClick={handleApplyFilters}>
            Applica Filtri
          </button>
          <button className={styles.resetBtn} onClick={handleResetFilters}>
            Reset Filtri
          </button>
        </div>
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
                Trovati {results.length} risultati{" "}
                {totalPages > 1 && `(Pagina ${currentPage} di ${totalPages})`}
              </h2>

              {/* DEBUG INFO VISIBILE */}
              {filters.minRating > 0 && (
                <div
                  style={{
                    color: "white",
                    textAlign: "center",
                    marginBottom: "10px",
                    fontSize: "14px",
                  }}
                >
                  DEBUG: Filtro valutazione ≥{filters.minRating} attivo
                </div>
              )}

              <div className={styles.resultsGrid}>
                {results.map((movie, index) => (
                  <div key={`${movie.id}-${currentPage}-${index}`}>
                    <MovieCard movie={movie} />
                    {/* DEBUG SOTTO OGNI LOCANDINA */}
                    {filters.minRating > 0 && (
                      <div
                        style={{
                          color:
                            movie.vote_average >= filters.minRating
                              ? "green"
                              : "red",
                          fontSize: "10px",
                          textAlign: "center",
                          marginTop: "2px",
                        }}
                      >
                        Rating: {movie.vote_average}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pulsante Carica Altro */}
              {hasMore && (
                <div className={styles.loadMoreSection}>
                  <button
                    className={styles.loadMoreBtn}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Caricamento..." : "Carica Altri Film"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noResults}>
              <p>
                Nessun film trovato con questi filtri. Prova a modificare i
                criteri di ricerca.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
