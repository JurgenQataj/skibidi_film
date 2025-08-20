import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode"; // *** CORREZIONE 1: Importa jwt-decode ***
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";

function ListPage() {
  const { listId } = useParams();
  const [listDetails, setListDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggedInUserId, setLoggedInUserId] = useState(null); // *** CORREZIONE 2: Stato per l'ID utente ***
  const API_URL = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    // *** CORREZIONE 3: Controlla chi è l'utente loggato ***
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedInUserId(jwtDecode(token).user.id);
    }

    const fetchListDetails = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/lists/${listId}`);
        setListDetails(response.data);
      } catch (error) {
        console.error("Errore nel caricamento della lista:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchListDetails();
  }, [listId, API_URL]);

  // *** CORREZIONE 4: Funzione per rimuovere un film dalla lista ***
  const handleRemoveFromList = async (tmdbId) => {
    if (
      !window.confirm("Sei sicuro di voler rimuovere questo film dalla lista?")
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/lists/${listId}/movies/${tmdbId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Aggiorna lo stato per rimuovere il film senza ricaricare la pagina
      setListDetails((prev) => ({
        ...prev,
        movies: prev.movies.filter((movie) => movie.tmdb_id !== tmdbId),
      }));
    } catch (error) {
      alert("Errore durante la rimozione del film.");
    }
  };

  if (loading) return <p className={styles.statusText}>Caricamento...</p>;
  if (!listDetails)
    return <p className={styles.statusText}>Lista non trovata.</p>;

  // *** CORREZIONE 5: Controlla se l'utente loggato è il proprietario della lista ***
  const isOwner =
    loggedInUserId &&
    listDetails.user &&
    loggedInUserId === listDetails.user._id;

  return (
    <div className={styles.pageContainer}>
      <header className={styles.header}>
        <h1 className={styles.title}>{listDetails.title}</h1>
        <p className={styles.description}>{listDetails.description}</p>
        <span className={styles.author}>
          Creata da: {listDetails.user.username}
        </span>
      </header>
      <div className={styles.reviewsGrid}>
        {listDetails.movies && listDetails.movies.length > 0 ? (
          listDetails.movies.map((movie) => (
            // *** CORREZIONE 6: Passa la funzione e mostra il pulsante solo al proprietario ***
            <MovieCard
              key={movie.tmdb_id}
              movie={movie}
              showDeleteButton={isOwner}
              onDelete={handleRemoveFromList}
            />
          ))
        ) : (
          <p className={styles.statusText}>Questa lista è vuota.</p>
        )}
      </div>
    </div>
  );
}

export default ListPage;
