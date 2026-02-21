import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./SearchPage.module.css";
import MovieCard from "../components/MovieCard";
import SearchInput from "../components/SearchInput";
import { SkeletonMovieCard, SkeletonPersonRow } from "../components/Skeleton";

function SearchPage() {
  // Helper per inizializzare lo stato da sessionStorage
  const getInitialState = (key, defaultValue) => {
    const saved = sessionStorage.getItem(key);
    return saved !== null ? JSON.parse(saved) : defaultValue;
  };

  const [results, setResults] = useState(() => getInitialState("search_results", []));
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(() => getInitialState("search_hasSearched", false));
  const [currentPage, setCurrentPage] = useState(() => getInitialState("search_currentPage", 1));
  const [totalPages, setTotalPages] = useState(() => getInitialState("search_totalPages", 0));
  const [hasMore, setHasMore] = useState(() => getInitialState("search_hasMore", false));
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get("query");
  const modeParam = searchParams.get("mode");
  const [searchMode, setSearchMode] = useState(() => {
    if (modeParam) return modeParam;
    return getInitialState("search_mode", "movie");
  });
  const navigate = useNavigate();
  const ignoreFilterChange = useRef(false); // Per evitare conflitti tra ricerca e filtri
  const isInitialMountFilter = useRef(true);
  const isInitialMountMode = useRef(true);

  // Stati per i filtri
  const [filters, setFilters] = useState(() => getInitialState("search_filters", {
    category: "popular",
    genre: "",
    releaseYear: { from: "", to: "" },
    minRating: 0,
    language: "",
    keywords: "",
    sortBy: "",
  }));

  // Salva in sessionStorage ad ogni modifica
  useEffect(() => {
    sessionStorage.setItem("search_results", JSON.stringify(results));
    sessionStorage.setItem("search_hasSearched", JSON.stringify(hasSearched));
    sessionStorage.setItem("search_currentPage", JSON.stringify(currentPage));
    sessionStorage.setItem("search_totalPages", JSON.stringify(totalPages));
    sessionStorage.setItem("search_hasMore", JSON.stringify(hasMore));
    sessionStorage.setItem("search_mode", JSON.stringify(searchMode));
    sessionStorage.setItem("search_filters", JSON.stringify(filters));
  }, [results, hasSearched, currentPage, totalPages, hasMore, searchMode, filters]);

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

  // *** OPZIONI ORDINAMENTO ***
  const sortOptions = [
    { value: "", name: "Predefinito" },
    { value: "popularity.desc", name: "Popolarità Decrescente" },
    { value: "popularity.asc", name: "Popolarità Crescente" },
    { value: "vote_average.desc", name: "Valutazione Decrescente" },
    { value: "vote_average.asc", name: "Valutazione Crescente" },
    { value: "release_date.desc", name: "Data Rilascio Decrescente" },
    { value: "release_date.asc", name: "Data Rilascio Crescente" },
  ];

  const API_URL = import.meta.env.VITE_API_URL || "";

  // Reset quando cambiano i filtri
  useEffect(() => {
    if (isInitialMountFilter.current) {
      isInitialMountFilter.current = false;
      return;
    }

    if (ignoreFilterChange.current) {
      ignoreFilterChange.current = false;
      return;
    }

    if (hasSearched) {
      setCurrentPage(1);
      setResults([]);
      performSearch(1, true);
    }
  }, [filters]);

  const [showFilters, setShowFilters] = useState(false);

  // Gestione ricerca con filtri
  const performSearch = async (page = 1, isNewSearch = false) => {
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
        ...(filters.sortBy && { sort_by: filters.sortBy }),
      });

      const response = await axios.get(
        `${API_URL}/api/movies/discover?${params.toString()}`
      );

      const newResults = response.data.results || [];

      if (isNewSearch) {
        setResults(newResults);
      } else {
        setResults((prev) => [...prev, ...newResults]);
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

    // Aggiorniamo SEMPRE l'URL con query e modalità corrente per tenerli sincronizzati
    // Questo è fondamentale per mantenere la modalità "person" attiva
    setSearchParams({ query, mode: searchMode });

    setLoading(true);
    setHasSearched(true);
    setCurrentPage(1);
    setResults([]);

    try {
      const endpoint = searchMode === "movie" 
        ? `${API_URL}/api/movies/search?query=${encodeURIComponent(query)}`
        : `${API_URL}/api/movies/search/person?query=${encodeURIComponent(query)}`;

      const response = await axios.get(endpoint);
      const searchResults = response.data.results || [];
      setResults(searchResults);
      setTotalPages(response.data.total_pages || 0);
      setHasMore(1 < (response.data.total_pages || 0));

      // Reset filtri quando si fa una ricerca testuale
      ignoreFilterChange.current = true; // Impedisce che il reset attivi performSearch
      setFilters({
        category: "popular",
        genre: "",
        releaseYear: { from: "", to: "" },
        minRating: 0,
        language: "",
        keywords: "",
        sortBy: "",
      });
    } catch (error) {
      console.error("Errore durante la ricerca:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Effetto per gestire la ricerca da URL (es. arrivo dalla Home)
  useEffect(() => {
    if (queryParam) {
      handleSearch(queryParam);
    } else if (!hasSearched) {
      // Se non c'è query nell'URL e non ho cercato nulla, mostro i popolari
      performSearch(1, true);
    }
  }, [queryParam]);

  // Sincronizza lo stato searchMode con l'URL (es. se usi tasti avanti/indietro o ricarichi)
  useEffect(() => {
    if (modeParam && (modeParam === "movie" || modeParam === "person")) {
      setSearchMode(modeParam);
    }
  }, [modeParam]);

  // Funzione per cambiare modalità e aggiornare l'URL
  const handleModeChange = (newMode) => {
    setSearchMode(newMode);
    if (queryParam) {
      setSearchParams({ query: queryParam, mode: newMode });
    }
  };

  // Effetto per ricaricare i risultati quando cambia la modalità (Film/Persone)
  useEffect(() => {
    if (isInitialMountMode.current) {
      isInitialMountMode.current = false;
      return;
    }

    if (queryParam) {
      handleSearch(queryParam);
    } else {
      setResults([]); // Pulisce i risultati se si cambia tab senza una ricerca attiva
    }
  }, [searchMode]);

  // Gestione selezione da suggerimenti
  const handleMovieSelect = (item) => {
    // item.title contiene il nome della persona grazie alla modifica nel backend
    if (searchMode === "person") {
      navigate(`/person/${encodeURIComponent(item.title)}`);
    } else {
      navigate(`/movie/${item.id}`);
    }
  };

  // Gestione cambio filtri
  const handleFilterChange = (filterType, value) => {
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
    setHasSearched(true);
    setCurrentPage(1);
    setResults([]);
    performSearch(1, true);
    setShowFilters(false); // Chiude i filtri dopo l'applicazione
  };

  // Reset filtri
  const handleResetFilters = () => {
    setFilters({
      category: "popular",
      genre: "",
      releaseYear: { from: "", to: "" },
      minRating: 0,
      language: "",
      keywords: "",
      sortBy: "",
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

  const categories = [
    { id: "popular", name: "Popolari" },
    { id: "now_playing", name: "In Onda" },
    { id: "top_rated", name: "Più Votati" },
    { id: "upcoming", name: "In Arrivo" },
  ];

  return (
    <div className={styles.pageContainer}>
      
      {/* HERO SECTION - Compact */}
      <div className={styles.heroSection}>
        <div className={styles.searchBarWrapper}>
           <SearchInput
             onSearch={handleSearch}
             onMovieSelect={handleMovieSelect}
             preventNavigation={true}
             placeholder={searchMode === "movie" ? "Cerca film..." : "Cerca persona..."}
             mode={searchMode}
           />
        </div>

        {/* Mode Toggles - Pills */}
        <div className={styles.modeToggle}>
             <button 
                onClick={() => handleModeChange("movie")}
                className={`${styles.modeButton} ${searchMode === "movie" ? styles.modeButtonActive : ""}`}
             >
                Film
             </button>
             <button 
                onClick={() => handleModeChange("person")}
                className={`${styles.modeButton} ${searchMode === "person" ? styles.modeButtonActive : ""}`}
             >
                Persone
             </button>
        </div>

        {/* Category Chips - Scrolls horizontally */}
        {searchMode === "movie" && (
            <div className={styles.chipsContainer}>
            {categories.map((cat) => (
                <button
                key={cat.id}
                className={`${styles.chip} ${
                    filters.category === cat.id ? styles.chipActive : ""
                }`}
                onClick={() => handleFilterChange("category", cat.id)}
                >
                {cat.name}
                </button>
            ))}
            </div>
        )}
      </div>

      {/* Advanced Filters Toggle & Apply Button */}
      {searchMode === "movie" && (
        <div className={styles.filterToggleBar}>
            <button 
                className={styles.toggleFiltersBtn}
                onClick={() => setShowFilters(!showFilters)}
            >
                {showFilters ? "Nascondi Filtri" : "Filtri Avanzati"}
                <span className={styles.icon}>{showFilters ? "▲" : "▼"}</span>
            </button>
            
            <button 
                className={styles.quickApplyBtn} 
                onClick={handleApplyFilters}
                title="Applica i filtri correnti"
            >
                Applica
            </button>
        </div>
      )}

      {/* Collapsible Filters Section */}
      {showFilters && searchMode === "movie" && (
          <div className={`${styles.filtersSection} ${styles.slideDown}`}>
            <div className={styles.filtersGrid}>
                {/* Ordinamento */}
                <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Ordina per</label>
                <select
                    className={styles.filterSelect}
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                >
                    {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.name}
                    </option>
                    ))}
                </select>
                </div>

                {/* Genere */}
                <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Genere</label>
                <select
                    className={styles.filterSelect}
                    value={filters.genre}
                    onChange={(e) => handleFilterChange("genre", e.target.value)}
                >
                    <option value="">Tutti</option>
                    {genres.map((genre) => (
                    <option key={genre.id} value={genre.id}>
                        {genre.name}
                    </option>
                    ))}
                </select>
                </div>

                {/* Anno */}
                <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Anno: {filters.releaseYear.from || "1900"} - {filters.releaseYear.to || "2030"}</label>
                <div className={styles.yearInputs}>
                    <input
                    type="number"
                    placeholder="Da"
                    className={styles.yearInput}
                    value={filters.releaseYear.from}
                    onChange={(e) => handleYearChange("from", e.target.value)}
                    />
                    <span className={styles.yearSeparator}>-</span>
                    <input
                    type="number"
                    placeholder="A"
                    className={styles.yearInput}
                    value={filters.releaseYear.to}
                    onChange={(e) => handleYearChange("to", e.target.value)}
                    />
                </div>
                </div>

                {/* Voto */}
                <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Voto Minimo (0-10)</label>
                <input
                    type="number"
                    className={styles.ratingInput} 
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="Es: 7.5"
                    value={filters.minRating === 0 ? "" : filters.minRating} /* Show empty if 0 for cleaner look, or keep 0 */
                    onChange={(e) => {
                      let val = parseFloat(e.target.value);
                      if (isNaN(val)) val = 0;
                      if (val > 10) val = 10;
                      if (val < 0) val = 0;
                      handleFilterChange("minRating", val);
                    }}
                />
                </div>

                {/* Lingua */}
                <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Lingua</label>
                <select
                    className={styles.filterSelect}
                    value={filters.language}
                    onChange={(e) => handleFilterChange("language", e.target.value)}
                >
                    <option value="">Tutte</option>
                    {languages.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                        {lang.name}
                    </option>
                    ))}
                </select>
                </div>
            </div>

            <div className={styles.filterActions}>
                <button className={styles.applyBtn} onClick={handleApplyFilters}>
                    Applica
                </button>
                <button className={styles.resetBtn} onClick={handleResetFilters}>
                    Reset
                </button>
            </div>
          </div>
      )}

      {loading && (
        <div className={searchMode === "person" ? styles.personList : styles.resultsGrid}>
          {Array.from({ length: searchMode === "person" ? 6 : 12 }).map((_, i) =>
            searchMode === "person"
              ? <SkeletonPersonRow key={i} />
              : <SkeletonMovieCard key={i} />
          )}
        </div>
      )}

      {hasSearched && !loading && (
        <div className={styles.resultsSection}>
          {results.length > 0 ? (
            <>
              {/* Removed redundant "Trovati X risultati" if styling is minimal/clean, or keep it small */}
              
              <div className={searchMode === "person" ? styles.personList : styles.resultsGrid}>
                {results.map((item, index) =>
                  searchMode === "movie" ? (
                    <MovieCard
                        key={`${item.id}-${currentPage}-${index}`}
                        movie={item}
                    />
                  ) : (
                    <div key={item.id} className={styles.personRow} onClick={() => navigate(`/person/${encodeURIComponent(item.name)}`)}>
                        <img
                            src={item.profile_path ? `https://image.tmdb.org/t/p/w185${item.profile_path}` : "https://via.placeholder.com/185x278?text=No+Img"}
                            alt={item.name}
                            className={styles.personRowImg}
                        />
                        <div className={styles.personRowInfo}>
                          <span className={styles.personRowName}>{item.name}</span>
                          {item.known_for && (
                            <span className={styles.personRowRole}>{item.known_for}</span>
                          )}
                        </div>
                    </div>
                  )
                )}
              </div>

              {/* Pulsante Carica Altro */}
              {hasMore && (
                <div className={styles.loadMoreSection}>
                  <button
                    className={styles.loadMoreBtn}
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "..." : "Carica Altri"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className={styles.noResults}>
              <p>
                Nessun risultato trovato.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchPage;
