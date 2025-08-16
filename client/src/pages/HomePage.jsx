import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import styles from "./HomePage.module.css";
import ReviewCard from "../components/ReviewCard";
import { useAuth } from "../context/AuthContext";

function HomePage() {
  const { logout } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true); // Inizia come true
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isFetching = useRef(false); // Usato per prevenire chiamate multiple

  const observer = useRef();
  const lastReviewElementRef = useCallback(
    (node) => {
      if (loading || isFetching.current) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const fetchFeed = useCallback(
    async (isInitialLoad = false) => {
      // Se stiamo già caricando, non fare nulla
      if (isFetching.current && !isInitialLoad) return;

      isFetching.current = true;
      setLoading(true);

      try {
        const token = localStorage.getItem("token");
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await axios.get(
          `${API_URL}/api/users/feed?page=${isInitialLoad ? 1 : page}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Filtra per assicurarsi che ogni recensione sia valida
        const validData = response.data.filter(
          (review) => review && review.id && review.movie_title
        );

        if (validData.length > 0) {
          setFeed((prevFeed) => {
            // Logica per evitare duplicati
            const allReviews = isInitialLoad
              ? validData
              : [...prevFeed, ...validData];
            const uniqueReviews = Array.from(
              new Map(allReviews.map((item) => [item.id, item])).values()
            );
            return uniqueReviews;
          });
        }

        if (response.data.length < 10) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Errore nel caricamento del feed:", error);
        setHasMore(false); // Blocca ulteriori caricamenti in caso di errore
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    },
    [page]
  );

  // useEffect per il caricamento iniziale
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchFeed(true);
  }, []); // Eseguito solo una volta all'inizio

  // useEffect per le pagine successive (infinite scroll)
  useEffect(() => {
    if (page > 1) {
      fetchFeed(false);
    }
  }, [page]);

  const handleInteraction = () => {
    // Ricarica il feed dall'inizio dopo un'interazione (like/commento)
    setPage(1);
    setHasMore(true);
    fetchFeed(true);
  };

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Il tuo Feed</h1>
        <button onClick={logout} className={styles.logoutButton}>
          Logout
        </button>
      </header>

      <div className={styles.feedContainer}>
        {feed.length > 0 &&
          feed.map((review, index) => {
            if (feed.length === index + 1) {
              return (
                <div ref={lastReviewElementRef} key={review.id}>
                  <ReviewCard
                    review={review}
                    onInteraction={handleInteraction}
                  />
                </div>
              );
            }
            return (
              <ReviewCard
                key={review.id}
                review={review}
                onInteraction={handleInteraction}
              />
            );
          })}

        {loading && <p className={styles.feedStatus}>Caricamento...</p>}
        {!hasMore && feed.length > 0 && (
          <p className={styles.feedStatus}>Hai raggiunto la fine del feed!</p>
        )}
        {feed.length === 0 && !loading && (
          <p className={styles.feedStatus}>
            Il tuo feed è vuoto. Segui i tuoi amici!
          </p>
        )}
      </div>
    </div>
  );
}

export default HomePage;
