import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./PersonPage.module.css";
import MovieCard from "../components/MovieCard";

function PersonPage() {
  const { name } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || "";
  const decodedName = decodeURIComponent(name);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Chiamata all'API che abbiamo creato nel backend
        const res = await axios.get(`${API_URL}/api/movies/person/${encodeURIComponent(name)}`);
        setData(res.data);
      } catch (error) {
        console.error("Errore caricamento persona:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [name, API_URL]);

  if (loading) return <div className={styles.loading}>Caricamento filmografia di {decodedName}...</div>;
  if (!data) return <div className={styles.error}>Nessun dato trovato per "{decodedName}".</div>;

  const hasDirected = data.directed && data.directed.length > 0;
  const hasActed = data.acted && data.acted.length > 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.pageTitle}>{data.personName}</h1>
      
      {!hasDirected && !hasActed && (
        <p className={styles.emptyMsg}>Nessun film trovato nel database per questa persona.</p>
      )}

      {hasDirected && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Regia ({data.directed.length})</h2>
          <div className={styles.grid}>
            {data.directed.map(movie => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </section>
      )}

      {hasActed && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cast ({data.acted.length})</h2>
          <div className={styles.grid}>
            {data.acted.map(movie => (
              <MovieCard key={movie._id} movie={movie} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default PersonPage;