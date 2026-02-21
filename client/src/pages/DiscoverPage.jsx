import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./DiscoverPage.module.css";
import UserCard from "../components/UserCard";
import { SkeletonUserCard } from "../components/Skeleton";

const SKELETON_COUNT = 6;

function DiscoverPage() {
  const [mostFollowed, setMostFollowed] = useState([]);
  const [newestUsers, setNewestUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "";
        const [followedRes, newestRes] = await Promise.all([
          axios.get(`${API_URL}/api/users/most-followed`),
          axios.get(`${API_URL}/api/users/newest`),
        ]);
        setMostFollowed(followedRes.data);
        setNewestUsers(newestRes.data);
      } catch (error) {
        console.error("Errore nel caricamento degli utenti:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className={styles.pageContainer}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>👑</span>
          <h1 className={styles.title}>Più Seguiti</h1>
          <div className={styles.divider} />
        </div>
        <div className={styles.gridContainer}>
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonUserCard key={i} />)
            : mostFollowed.map((user) => <UserCard key={user._id} user={user} />)
          }
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionIcon}>✨</span>
          <h1 className={styles.title}>Nuovi Iscritti</h1>
          <div className={styles.divider} />
        </div>
        <div className={styles.gridContainer}>
          {loading
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonUserCard key={i} />)
            : newestUsers.map((user) => <UserCard key={user._id} user={user} />)
          }
        </div>
      </section>
    </div>
  );
}

export default DiscoverPage;
