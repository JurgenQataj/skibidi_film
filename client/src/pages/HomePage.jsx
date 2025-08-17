import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import styles from "./HomePage.module.css";
import ReviewCard from "../components/ReviewCard";
import { useAuth } from "../context/AuthContext";

function HomePage() {
  const { logout } = useAuth();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const isFetching = useRef(false);

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
    async (isRefresh = false) => {
      const targetPage = isRefresh ? 1 : page;
      if (isFetching.current && !isRefresh) return;

      isFetching.current = true;
      setLoading(true);

      try {
        const token = localStorage.getItem("token");
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const { data } = await axios.get(
          `${API_URL}/api/users/feed?page=${targetPage}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        setFeed((prev) => {
          const newFeed = isRefresh ? data : [...prev, ...data];
          return Array.from(
            new Map(newFeed.map((item) => [item.id, item])).values()
          );
        });

        if (data.length < 10) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Errore nel caricamento del feed:", error);
        setHasMore(false);
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    },
    [page, hasMore]
  );

  useEffect(() => {
    fetchFeed(true);
  }, []);

  useEffect(() => {
    if (page > 1) fetchFeed(false);
  }, [page]);

  const handleInteraction = () => fetchFeed(true);

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>Il tuo Feed</h1>
        <button onClick={logout} className={styles.logoutButton}>
          Logout
        </button>
      </header>
      <div className={styles.feedContainer}>
        {feed.map((review, index) => {
          if (feed.length === index + 1) {
            return (
              <div ref={lastReviewElementRef} key={review.id}>
                <ReviewCard review={review} onInteraction={handleInteraction} />
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
            Il tuo feed è vuoto. Segui i tuoi amici per vedere le loro
            recensioni!
          </p>
        )}
      </div>
    </div>
  );
}

export default HomePage;
