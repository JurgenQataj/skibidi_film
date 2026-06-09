import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./WatchlistPage.module.css";
import MovieCard from "../components/MovieCard";
import { SkeletonMovieCard } from "../components/Skeleton";
import { useToast } from "../context/ToastContext";
import ImportListModal from "../components/ImportListModal";
import { Download } from "lucide-react";
import { useCallback } from "react";

function ListPage() {
  const { listId } = useParams();
  const [listDetails, setListDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [loggedInUserId, setLoggedInUserId] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL || "";
  const { toast, confirm } = useToast();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchListDetails = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/lists/${listId}`);
      setListDetails(response.data);
    } catch (error) {
      console.error("Errore nel caricamento della lista:", error);
    } finally {
      setLoading(false);
    }
  }, [listId, API_URL]);

  useEffect(() => {
    // *** CORREZIONE 3: Controlla chi è l'utente loggato ***
    const token = localStorage.getItem("token");
    if (token) {
      setLoggedInUserId(jwtDecode(token).user.id);
    }
    fetchListDetails();
  }, [fetchListDetails]);

  // *** CORREZIONE 4: Funzione per rimuovere un film dalla lista ***
  const handleRemoveFromList = async (tmdbId) => {
    const ok = await confirm("Sei sicuro di voler rimuovere questo film dalla lista?");
    if (!ok) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/lists/${listId}/movies/${tmdbId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setListDetails((prev) => ({
        ...prev,
        movies: prev.movies.filter((movie) => movie.tmdb_id !== tmdbId),
      }));
    } catch (error) {
      toast("Errore durante la rimozione del film.", "error");
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
        <div className={styles.headerTop}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
            <h1 className={styles.title}>{listDetails.title}</h1>
            <p className={styles.description}>{listDetails.description}</p>
            <span className={styles.author}>
              Creata da: {listDetails.user.username}
            </span>
          </div>
          {isOwner && (
            <button 
              className={styles.importListBtn} 
              onClick={() => setIsImportModalOpen(true)}
            >
              <Download size={16} />
              Importa da altre Liste
            </button>
          )}
        </div>
      </header>
      <div className={styles.reviewsGrid}>
        {listDetails.movies && listDetails.movies.length > 0 ? (
          listDetails.movies.map((movie) => (
            <div
              key={movie.tmdb_id}
              className={styles.cardWrapper}
              onClick={(e) => {
                if (!e.target.closest("button")) {
                  navigate(`/${movie.media_type === "tv" ? "tv" : "movie"}/${movie.tmdb_id}`);
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

      <ImportListModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
        targetListId={listId}
        onSuccess={fetchListDetails}
      />
    </div>
  );
}

export default ListPage;
