import React, { useState, useEffect } from "react";
import axios from "axios";
import Modal from "./Modal";
import { useToast } from "../context/ToastContext";
import styles from "./ImportListModal.module.css";
import { jwtDecode } from "jwt-decode";
import { ChevronRight } from "lucide-react";

export default function ImportListModal({ isOpen, onClose, targetListId, onSuccess }) {
  const [step, setStep] = useState(1); // 1: Select User, 2: Select List, 3: Select Movies
  const [loading, setLoading] = useState(false);
  
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchUserQuery, setSearchUserQuery] = useState("");
  
  const [lists, setLists] = useState([]);
  const [selectedList, setSelectedList] = useState(null);
  
  const [movies, setMovies] = useState([]);
  const [selectedMovies, setSelectedMovies] = useState([]);

  const API_URL = import.meta.env.VITE_API_URL || "";
  const { toast } = useToast();

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedUser(null);
      setSelectedList(null);
      setSelectedMovies([]);
      fetchFollowingUsers();
    }
  }, [isOpen]);

  const fetchFollowingUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const decodedToken = jwtDecode(token);
      const currentUserId = decodedToken.user.id;
      
      const response = await axios.get(`${API_URL}/api/users/${currentUserId}/following`);
      // Mostra solo utenti seguiti. Si potrebbe implementare anche una barra di ricerca generale in futuro.
      setUsers(response.data);
    } catch (error) {
      console.error("Errore fetching users:", error);
      toast("Impossibile caricare gli utenti seguiti.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/users/${user._id}/lists`);
      setLists(response.data || []);
      setStep(2);
    } catch (error) {
      console.error("Errore fetching lists:", error);
      toast("Impossibile caricare le liste dell'utente.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectList = async (list) => {
    setSelectedList(list);
    setLoading(true);
    try {
      let moviesData = [];
      if (list._id === "watchlist") {
        const response = await axios.get(`${API_URL}/api/watchlist/user/${selectedUser._id}`);
        moviesData = response.data;
      } else {
        const response = await axios.get(`${API_URL}/api/lists/${list._id}`);
        moviesData = response.data.movies || [];
      }
      setMovies(moviesData);
      setStep(3);
    } catch (error) {
      console.error("Errore fetching movies:", error);
      toast("Impossibile caricare i film della lista.", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleMovieSelection = (movie) => {
    setSelectedMovies(prev => {
      const isSelected = prev.some(m => m.tmdbId === movie.tmdb_id && m.mediaType === movie.media_type);
      if (isSelected) {
        return prev.filter(m => !(m.tmdbId === movie.tmdb_id && m.mediaType === movie.media_type));
      } else {
        return [...prev, { tmdbId: movie.tmdb_id, mediaType: movie.media_type || "movie" }];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedMovies.length === movies.length) {
      setSelectedMovies([]); // deselect all
    } else {
      setSelectedMovies(movies.map(m => ({ tmdbId: m.tmdb_id, mediaType: m.media_type || "movie" })));
    }
  };

  const handleImport = async () => {
    if (selectedMovies.length === 0) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const payload = { movies: selectedMovies };

      if (targetListId === "watchlist") {
        await axios.post(`${API_URL}/api/watchlist/batch`, payload, config);
      } else {
        await axios.post(`${API_URL}/api/lists/${targetListId}/batch`, payload, config);
      }

      toast(`${selectedMovies.length} film importati con successo!`, "success");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Errore importazione:", error);
      const serverMessage = error.response?.data?.message || "Errore durante l'importazione.";
      toast(serverMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Importa da altre Liste" size="large">
      <div className={styles.modalContainer}>
        {loading && <div className={styles.loadingSpinner}>Caricamento in corso...</div>}

        {!loading && step === 1 && (
          <>
            <div className={styles.stepHeader}>
              <h3 className={styles.stepTitle}>Seleziona un utente che segui</h3>
            </div>
            
            {users.length > 5 && (
              <input 
                type="text" 
                placeholder="Cerca utente..." 
                className={styles.searchInput}
                value={searchUserQuery}
                onChange={(e) => setSearchUserQuery(e.target.value)}
              />
            )}

            {users.length === 0 ? (
              <div className={styles.emptyState}>Non segui ancora nessun utente.</div>
            ) : (
              <div className={styles.usersList}>
                {users.filter(u => !searchUserQuery || u.username.toLowerCase().includes(searchUserQuery.toLowerCase())).map(user => (
                  <div key={user._id} className={styles.userRow} onClick={() => handleSelectUser(user)}>
                    <div className={styles.userLeftInfo}>
                      <img 
                        src={user.avatar_url || "https://assets.pokemon.com/assets/cms2/img/pokedex/full/151.png"} 
                        className={styles.userAvatar} 
                        alt={user.username} 
                        loading="lazy"
                      />
                      <div className={styles.userTextInfo}>
                        <div className={styles.userName}>{user.username}</div>
                        <div className={styles.userSub}>Visualizza le sue liste e watchlist</div>
                      </div>
                    </div>
                    <ChevronRight className={styles.chevronRight} size={18} />
                  </div>
                ))}
                
                {users.length > 0 && users.filter(u => !searchUserQuery || u.username.toLowerCase().includes(searchUserQuery.toLowerCase())).length === 0 && (
                  <div className={styles.emptyState}>Nessun utente trovato con questo nome.</div>
                )}
              </div>
            )}
          </>
        )}

        {!loading && step === 2 && (
          <>
            <div className={styles.stepHeader}>
              <h3 className={styles.stepTitle}>Liste di {selectedUser?.username}</h3>
              <button className={styles.backButton} onClick={() => setStep(1)}>Indietro</button>
            </div>
            <div className={styles.listsGrid}>
              {lists.map(list => (
                <div key={list._id} className={styles.listCard} onClick={() => handleSelectList(list)}>
                  <div className={styles.listIcon}>{list._id === "watchlist" ? "👀" : "🎬"}</div>
                  <div className={styles.listInfo}>
                    <h4>{list.title}</h4>
                    {list.description && <p>{list.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && step === 3 && (
          <>
            <div className={styles.stepHeader}>
              <h3 className={styles.stepTitle}>Seleziona i film da importare</h3>
              <button className={styles.backButton} onClick={() => setStep(2)}>Indietro</button>
            </div>
            
            {movies.length === 0 ? (
              <div className={styles.emptyState}>Questa lista è vuota.</div>
            ) : (
              <>
                <div className={styles.moviesGrid}>
                  {movies.map(movie => {
                    const isSelected = selectedMovies.some(m => m.tmdbId === movie.tmdb_id && m.mediaType === movie.media_type);
                    const movieTitle = movie.title || movie.name || "Titolo non disponibile";
                    return (
                      <div 
                        key={`${movie.media_type || 'movie'}-${movie.tmdb_id}`} 
                        className={`${styles.movieItem} ${isSelected ? styles.selected : ''}`}
                        onClick={() => toggleMovieSelection(movie)}
                        title={movieTitle}
                      >
                        <img 
                          src={movie.poster_path ? `https://image.tmdb.org/t/p/w185${movie.poster_path}` : "https://placehold.co/185x278?text=No+Img"} 
                          className={styles.moviePoster}
                          alt={movieTitle}
                          loading="lazy"
                        />
                        <div className={styles.movieTitleOverlay}>
                          {movieTitle}
                        </div>
                        <div className={styles.checkboxOverlay}>
                          {isSelected && <span className={styles.checkIcon}>✓</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className={styles.actionsFooter}>
                  <button className={styles.selectAllBtn} onClick={toggleSelectAll}>
                    {selectedMovies.length === movies.length ? "Deseleziona Tutto" : "Seleziona Tutto"}
                  </button>
                  <button 
                    className={styles.importBtn} 
                    disabled={selectedMovies.length === 0}
                    onClick={handleImport}
                  >
                    Importa ({selectedMovies.length})
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
