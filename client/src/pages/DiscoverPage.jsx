import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./DiscoverPage.module.css";
import UserCard from "../components/UserCard";
import MovieCard from "../components/MovieCard";
import { SkeletonUserCard, SkeletonMovieCard, SkeletonWithLogo } from "../components/Skeleton";
import GlobalChat from "../components/GlobalChat";

const SKELETON_COUNT = 8;

function DiscoverPage() {
  const [mostFollowed, setMostFollowed] = useState([]);
  const [newestUsers, setNewestUsers] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTv, setTrendingTv] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const [followedRes, newestRes, moviesRes, tvRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/most-followed`),
          axios.get(`${API_URL}/api/users/newest`),
          axios.get(`${API_URL}/api/movies/trending?timeWindow=day`),
          axios.get(`${API_URL}/api/tv/trending?timeWindow=day`),
        ]);
        setMostFollowed(followedRes.data);
        setNewestUsers(newestRes.data);
        setTrendingMovies(moviesRes.data.slice(0, 10));
        setTrendingTv(tvRes.data.slice(0, 10));
      } catch (error) {
        console.error("Errore nel caricamento degli utenti:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className={styles.pageWrapper}>
      {/* CHAT IN CIMA */}
      <section className={styles.chatSection}>
         <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>💬</span>
            <h2 className={styles.title}>Chat Globale</h2>
         </div>
         <GlobalChat />
      </section>

      {/* LISTA UTENTI IN VERTICALE */}
      <div className={styles.verticalLists}>
          {loading ? <SkeletonWithLogo /> : (
            <>
              {/* Più Seguiti */}
              <section className={styles.userColumn}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>👑</span>
                  <h2 className={styles.title}>Più Seguiti</h2>
                </div>
                <div className={styles.userList}>
                  {mostFollowed.map((user) => <UserCard key={user._id} user={user} />)}
                </div>
              </section>

              {/* Nuovi Iscritti */}
              <section className={styles.userColumn}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>✨</span>
                  <h2 className={styles.title}>Nuovi Iscritti</h2>
                </div>
                <div className={styles.userList}>
                  {newestUsers.map((user) => <UserCard key={user._id} user={user} />)}
                </div>
              </section>
            </>
          )}
      </div>
    </div>
  );
}

export default DiscoverPage;
