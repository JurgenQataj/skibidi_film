import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./DiscoverPage.module.css";
import UserCard from "../components/UserCard";
import MovieCard from "../components/MovieCard";

function DiscoverPage() {
  // State per gli utenti
  const [mostFollowed, setMostFollowed] = useState([]);
  const [newestUsers, setNewestUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // State per i film
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [popularThisMonth, setPopularThisMonth] = useState([]);
  const [popularThisYear, setPopularThisYear] = useState([]);
  const [mostReviewed, setMostReviewed] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState("");
  const [moviesByGenre, setMoviesByGenre] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [trendingTimeWindow, setTrendingTimeWindow] = useState("week");

  const API_URL = import.meta.env.VITE_API_URL || "";

  // Fetch utenti
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const [followedRes, newestRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/most-followed`),
          axios.get(`${API_URL}/api/users/newest`),
        ]);
        setMostFollowed(followedRes.data);
        setNewestUsers(newestRes.data);
      } catch (error) {
        console.error("Errore nel caricamento degli utenti:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [API_URL]);

  // Fetch film iniziali
  useEffect(() => {
    const fetchInitialMovies = async () => {
      setLoadingMovies(true);
      try {
        const [
          trendingRes,
          monthRes,
          yearRes,
          reviewedRes,
          genresRes,
        ] = await Promise.all([
          axios.get(`${API_URL}/api/movies/trending?time_window=week`),
          axios.get(
            `${API_URL}/api/movies/popular?start_date=${
              new Date(new Date().setMonth(new Date().getMonth() - 1))
                .toISOString()
                .split("T")[0]
            }`
          ),
          axios.get(
            `${API_URL}/api/movies/popular?start_date=${
              new Date(new Date().setFullYear(new Date().getFullYear() - 1))
                .toISOString()
                .split("T")[0]
            }`
          ),
          axios.get(`${API_URL}/api/movies/most-reviewed`),
          axios.get(`${API_URL}/api/movies/genres`),
        ]);
        setTrendingMovies(trendingRes.data);
        setPopularThisMonth(monthRes.data);
        setPopularThisYear(yearRes.data);
        setMostReviewed(reviewedRes.data);
        setGenres(genresRes.data);
      } catch (error) {
        console.error("Errore nel caricamento dei film:", error);
      } finally {
        setLoadingMovies(false);
      }
    };
    fetchInitialMovies();
  }, [API_URL]);

  // Fetch film per genere selezionato
  useEffect(() => {
    if (selectedGenre) {
      const fetchMoviesByGenre = async () => {
        try {
          const res = await axios.get(
            `${API_URL}/api/movies/genre/${selectedGenre}`
          );
          setMoviesByGenre(res.data);
        } catch (error) {
          console.error("Errore caricamento film per genere:", error);
        }
      };
      fetchMoviesByGenre();
    } else {
      setMoviesByGenre([]);
    }
  }, [selectedGenre, API_URL]);

  // Fetch film di tendenza quando cambia la time window
  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await axios.get(
          `${API_URL}/api/movies/trending?time_window=${trendingTimeWindow}`
        );
        setTrendingMovies(res.data);
      } catch (error) {
        console.error("Errore caricamento film di tendenza:", error);
      }
    };
    fetchTrending();
  }, [trendingTimeWindow, API_URL]);

  return (
    <div className={styles.pageContainer}>
      {/* Sezione Film */}
      <h1 className={styles.mainTitle}>Scopri Film</h1>

      {/* Film di Tendenza */}
      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>Film di Tendenza</h2>
          <div className={styles.toggleButtons}>
            <button
              onClick={() => setTrendingTimeWindow("day")}
              className={trendingTimeWindow === "day" ? styles.active : ""}
            >
              Oggi
            </button>
            <button
              onClick={() => setTrendingTimeWindow("week")}
              className={trendingTimeWindow === "week" ? styles.active : ""}
            >
              Questa Settimana
            </button>
          </div>
        </div>
        <div className={styles.gridContainer}>
          {loadingMovies ? (
            <p>Caricamento...</p>
          ) : (
            trendingMovies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))
          )}
        </div>
      </section>

      {/* Popolari questo mese */}
      <section>
        <h2 className={styles.title}>Popolari questo Mese</h2>
        <div className={styles.gridContainer}>
          {loadingMovies ? (
            <p>Caricamento...</p>
          ) : (
            popularThisMonth.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))
          )}
        </div>
      </section>

      {/* Popolari quest'anno */}
      <section>
        <h2 className={styles.title}>Popolari quest'Anno</h2>
        <div className={styles.gridContainer}>
          {loadingMovies ? (
            <p>Caricamento...</p>
          ) : (
            popularThisYear.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))
          )}
        </div>
      </section>

      {/* Più Recensiti */}
      <section>
        <h2 className={styles.title}>I più Recensiti dalla Community</h2>
        <div className={styles.gridContainer}>
          {loadingMovies ? (
            <p>Caricamento...</p>
          ) : (
            mostReviewed.map((movie) => (
              <MovieCard key={movie.tmdb_id} movie={movie} />
            ))
          )}
        </div>
      </section>

      {/* Per Genere */}
      <section>
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>Cerca per Genere</h2>
          <select
            className={styles.genreSelect}
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="">Seleziona un genere</option>
            {genres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.gridContainer}>
          {moviesByGenre.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* Sezione Utenti */}
      <h1 className={styles.mainTitle}>Scopri Utenti</h1>
      <section>
        <h2 className={styles.title}>Utenti più Seguiti</h2>
        <div className={styles.gridContainer}>
          {loadingUsers ? (
            <p>Caricamento...</p>
          ) : (
            mostFollowed.map((user) => <UserCard key={user._id} user={user} />)
          )}
        </div>
      </section>
      <section>
        <h2 className={styles.title}>Nuovi Iscritti</h2>
        <div className={styles.gridContainer}>
          {loadingUsers ? (
            <p>Caricamento...</p>
          ) : (
            newestUsers.map((user) => <UserCard key={user._id} user={user} />)
          )}
        </div>
      </section>
    </div>
  );
}

export default DiscoverPage;
