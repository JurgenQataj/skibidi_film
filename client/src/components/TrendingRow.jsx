import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styles from "./TrendingRow.module.css";
import MovieCard from "./MovieCard";
import { SkeletonMovieCard } from "./Skeleton";

const TrendingRow = () => {
  const [timeWindow, setTimeWindow] = useState("day"); // 'day' o 'week'
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo =
        direction === "left"
          ? scrollLeft - clientWidth + 100
          : scrollLeft + clientWidth - 100;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const fetchTrending = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const response = await axios.get(`${API_URL}/api/movies/trending?timeWindow=${timeWindow}&_t=${Date.now()}`);
        setMovies(response.data || []);
      } catch (err) {
        console.error("Errore caricamento tendenze:", err);
        setError("Impossibile caricare i film in tendenza.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [timeWindow]);

  return (
    <div className={styles.trendingRowContainer}>
      <div className={styles.header}>
        <h2 className={styles.title}>In Tendenza</h2>
        <div className={styles.toggleContainer}>
          <button
            className={`${styles.toggleButton} ${timeWindow === "day" ? styles.active : ""}`}
            onClick={() => setTimeWindow("day")}
          >
            Oggi
          </button>
          <button
            className={`${styles.toggleButton} ${timeWindow === "week" ? styles.active : ""}`}
            onClick={() => setTimeWindow("week")}
          >
            Questa settimana
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.scrollContainer}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.cardWrapper}>
              <SkeletonMovieCard />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.rowWrapper}>
          <button
            className={`${styles.navButton} ${styles.left}`}
            onClick={() => handleScroll("left")}
            aria-label="Scorri a sinistra"
          >
            <FaChevronLeft size={24} />
          </button>

          <div className={styles.scrollContainer} ref={scrollRef}>
            {movies.map((movie) => (
              <div key={movie.id} className={styles.cardWrapper}>
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>

          <button
            className={`${styles.navButton} ${styles.right}`}
            onClick={() => handleScroll("right")}
            aria-label="Scorri a destra"
          >
            <FaChevronRight size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TrendingRow;
