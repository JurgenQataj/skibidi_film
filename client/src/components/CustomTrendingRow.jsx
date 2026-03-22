import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaChevronLeft, FaChevronRight, FaBell, FaNewspaper } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import styles from "./CustomTrendingRow.module.css";
import MovieCard from "./MovieCard";
import { SkeletonMovieCard } from "./Skeleton";

import { motion } from "framer-motion"; // Aggiunto import per animazioni

const API_URL = import.meta.env.VITE_API_URL || "";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

const CustomTrendingRow = () => {
  const [mediaType, setMediaType] = useState("movie"); // 'movie' o 'tv'
  const [timeWindow, setTimeWindow] = useState("day"); // 'day' o 'week'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  // Notifiche — utilizzate per la campanella mobile
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const fetchUnread = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount((res.data || []).filter((n) => !n.read).length);
      } catch {}
    };

    fetchUnread();
    const id = setInterval(fetchUnread, 15000);
    return () => clearInterval(id);
  }, []);

  const handleBellClick = async () => {
    const token = localStorage.getItem("token");
    if (token && unreadCount > 0) {
      try {
        await axios.put(`${API_URL}/api/notifications/read`, {}, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount(0);
      } catch {}
    }
    navigate("/notifications");
  };

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
        const endpointPrefix = mediaType === "tv" ? "tv" : "movies";
        const response = await axios.get(
          `${API_URL}/api/${endpointPrefix}/trending?timeWindow=${timeWindow}&_t=${Date.now()}`
        );
        setItems(response.data || []);
      } catch (err) {
        console.error("Errore caricamento tendenze:", err);
        setError("Impossibile caricare i contenuti in tendenza.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, [mediaType, timeWindow]);

  return (
    <div className={styles.trendingRowContainer}>
      <div className={styles.header}>
        {/* Switch di Sinistra (Film / Serie TV) */}
        <div className={styles.toggleContainer}>
          <button
            className={`${styles.toggleButton} ${mediaType === "movie" ? styles.active : ""}`}
            onClick={() => setMediaType("movie")}
          >
            Film
          </button>
          <button
            className={`${styles.toggleButton} ${mediaType === "tv" ? styles.active : ""}`}
            onClick={() => setMediaType("tv")}
          >
            Serie TV
          </button>
        </div>

        {/* Testo Centrale */}
        <h2 className={styles.title}>Tendenza</h2>

        {/* Switch di Destra (Oggi / Questa Settimana) */}
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
            Settimana
          </button>
        </div>

        {/* Campanella notifiche e Icona News (allineate a destra) */}
        <div className={styles.headerIconsContainer}>
          <button
            className={styles.mobileBell}
            onClick={handleBellClick}
            aria-label="Notifiche"
          >
            <FaBell />
            {unreadCount > 0 && (
              <span className={styles.mobileBellBadge}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <button
            className={styles.newsButton}
            onClick={() => navigate("/news")}
            aria-label="News"
          >
            <FaNewspaper />
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

          <motion.div 
            className={styles.scrollContainer} 
            ref={scrollRef}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`${mediaType}-${timeWindow}`} // Re-trigger animation on key change
          >
            {items.map((item) => (
              <motion.div key={item.id} className={styles.cardWrapper} variants={itemVariants}>
                <MovieCard movie={{ ...item, media_type: mediaType }} />
              </motion.div>
            ))}
          </motion.div>

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

export default CustomTrendingRow;
