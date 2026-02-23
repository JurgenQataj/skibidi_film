import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./DiscoverPage.module.css";
import UserCard from "../components/UserCard";
import { SkeletonUserCard } from "../components/Skeleton";
import GlobalChat from "../components/GlobalChat";

const SKELETON_COUNT = 8;

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
    <div className={styles.pageWrapper}>
      {/* CHAT IN CIMA */}
      <div className={styles.chatSection}>
        <GlobalChat />
      </div>

      {/* DUE COLONNE AFFIANCATE SOTTO */}
      <div className={styles.usersGrid}>
        {/* Più Seguiti */}
        <section className={styles.userColumn}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>👑</span>
            <h2 className={styles.title}>Più Seguiti</h2>
          </div>
          <div className={styles.userList}>
            {loading
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonUserCard key={i} />)
              : mostFollowed.map((user) => <UserCard key={user._id} user={user} />)
            }
          </div>
        </section>

        {/* Nuovi Iscritti */}
        <section className={styles.userColumn}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionIcon}>✨</span>
            <h2 className={styles.title}>Nuovi Iscritti</h2>
          </div>
          <div className={styles.userList}>
            {loading
              ? Array.from({ length: SKELETON_COUNT }).map((_, i) => <SkeletonUserCard key={i} />)
              : newestUsers.map((user) => <UserCard key={user._id} user={user} />)
            }
          </div>
        </section>
      </div>
    </div>
  );
}

export default DiscoverPage;
