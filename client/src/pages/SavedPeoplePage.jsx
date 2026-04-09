import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./SavedPeoplePage.module.css";
import { SkeletonWithLogo } from "../components/Skeleton";

export default function SavedPeoplePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchSavedPeople = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/users/${userId}/profile`);
        // Reverse array to show most recently saved people first
        const savedData = res.data.savedPeople ? [...res.data.savedPeople].reverse() : [];
        setPeople(savedData);
        setUsername(res.data.username);
      } catch (error) {
        console.error("Errore nel caricamento delle persone salvate", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSavedPeople();
  }, [userId, API_URL]);

  if (loading) return <SkeletonWithLogo />;

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.headerContainer}>
        <div className={styles.titleArea}>
          <span className={styles.superTitle}>Libreria Personale</span>
          <h1 className={styles.mainTitle}>I Preferiti di {username}</h1>
        </div>
        <button 
          className={styles.backButton} 
          onClick={() => navigate(`/profile/${userId}`)}
          aria-label="Torna al profilo"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Indietro
        </button>
      </header>

      <main className={styles.contentArea}>
        {people.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🎬</div>
            <h2 className={styles.emptyTitle}>Nessun talento salvato</h2>
            <p className={styles.emptyDesc}>Visita il profilo di un attore o regista e clicca "Salva" per aggiungerlo alla tua libreria personale.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {people.map((person, index) => {
              // Staggered entrance animation delay
              const delay = `${Math.min(index * 0.05, 0.5)}s`;
              
              return (
                <Link 
                  key={person.id} 
                  to={`/person/${encodeURIComponent(person.name)}`} 
                  className={styles.actorCard}
                  style={{ animationDelay: delay }}
                >
                  <div className={styles.imageWrapper}>
                    <img 
                      className={styles.image} 
                      src={person.profile_path ? `https://image.tmdb.org/t/p/w500${person.profile_path}` : "https://placehold.co/300x450/1a1a2e/666?text=?"} 
                      alt={person.name} 
                      loading="lazy"
                    />
                  </div>
                  <div className={styles.overlay}>
                    <div className={styles.nameInfo}>
                      <h3 className={styles.actorName}>{person.name}</h3>
                      <span className={styles.viewProfileLabel}>Apri Profilo</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
