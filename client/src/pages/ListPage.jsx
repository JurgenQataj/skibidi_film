import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import styles from "./ListPage.module.css";
import MovieCard from "../components/MovieCard";

function ListPage() {
  const { listId } = useParams();
  const [listDetails, setListDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListDetails = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await axios.get(`${API_URL}/api/lists/${listId}`);
        setListDetails(response.data);
      } catch (error) {
        console.error("Errore nel caricamento della lista:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListDetails();
  }, [listId]);

  if (loading) return <p className={styles.statusText}>Caricamento...</p>;
  if (!listDetails)
    return <p className={styles.statusText}>Lista non trovata.</p>;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>{listDetails.title}</h1>
        <p className={styles.description}>{listDetails.description}</p>
        <span className={styles.author}>Creata da: {listDetails.author}</span>
      </header>
      <div className={styles.moviesGrid}>
        {listDetails.movies && listDetails.movies.length > 0 ? (
          listDetails.movies.map((movie) => (
            <MovieCard key={movie.tmdb_id} movie={movie} />
          ))
        ) : (
          <p className={styles.statusText}>Questa lista è vuota.</p>
        )}
      </div>
    </div>
  );
}

export default ListPage;
