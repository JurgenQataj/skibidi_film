import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import styles from "./PartialCollectionsPage.module.css";
import { SkeletonListCard } from "../components/Skeleton";

function PartialCollectionsPage() {
  const [partials, setPartials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL || "";

  const fetchPartials = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Utente non autenticato");
      const decoded = jwtDecode(token);
      const userId = decoded.user.id;

      const res = await axios.get(`${API_URL}/api/users/${userId}/partial-collections`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPartials(res.data);
    } catch (err) {
      console.error(err);
      setError("Impossibile caricare le saghe iniziate.");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchPartials();
  }, [fetchPartials]);

  const posterBaseUrl = "https://image.tmdb.org/t/p/w300";

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <div className={styles.titleArea}>
          <span className={styles.headerIcon}>⏱️</span>
          <h1>Saghe Iniziate</h1>
        </div>
        <p className={styles.subtitle}>
          Collezioni in cui hai esplorato almeno un film, ma che attendono ancora di essere completate.
        </p>
      </header>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonListCard key={i} />)}
        </div>
      ) : error ? (
        <div className={styles.emptyState}>{error}</div>
      ) : partials.length === 0 ? (
        <div className={styles.emptyState}>
          <p>Non hai nessuna saga in sospeso. Ottimo lavoro!</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {partials.map((p) => (
            <Link key={p.id} to={`/collection/${p.id}`} className={styles.card}>
              <div className={styles.posterContainer}>
                <img 
                  src={p.poster_path ? `${posterBaseUrl}${p.poster_path}` : "https://via.placeholder.com/300x450.png?text=No+Image"} 
                  alt={p.name} 
                  className={styles.poster}
                />
                <div className={styles.progressBadge}>
                  {p.missing} mancanti
                </div>
              </div>
              <div className={styles.info}>
                <h3 className={styles.name}>{p.name}</h3>
                <div className={styles.barContainer}>
                  <div 
                    className={styles.barFill} 
                    style={{ width: `${(p.seen / p.total) * 100}%` }}
                  ></div>
                </div>
                <div className={styles.counts}>
                  Visuati: {p.seen} su {p.total}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default PartialCollectionsPage;
