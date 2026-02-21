import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode"; // *** CORREZIONE 1: Importa jwt-decode ***
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard } from "../components/Skeleton";

function ListPage() {
  const { listId } = useParams();
  const [listDetails, setListDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
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

  if (loading) return (
    <div className={styles.pageContainer}>
      <div className={styles.reviewsGrid}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonMovieCard key={i} />)}
      </div>
    </div>
  );
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
            <div
              key={movie.tmdb_id}
              className={styles.cardWrapper}
              onClick={(e) => {
                if (!e.target.closest("button")) {
                  navigate(`/movie/${movie.tmdb_id}`);
                }
              }}
            >
              <MovieCard
                movie={movie}
                showDeleteButton={isOwner}
                onDelete={handleRemoveFromList}
              />
            </div>
          ))
        ) : (
          <p className={styles.statusText}>Questa lista è vuota.</p>
        )}
      </div>
    </div>
  );
}

export default ListPage;
