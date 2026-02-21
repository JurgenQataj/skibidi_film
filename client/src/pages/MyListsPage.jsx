import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import styles from "./MyListsPage.module.css";
import { FaPlus, FaTrash, FaFilm, FaBookmark } from "react-icons/fa";
import { SkeletonListCard } from "../components/Skeleton";

function MyListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const API_URL = import.meta.env.VITE_API_URL || "";

  const fetchLists = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Utente non autenticato");
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.user.id;
      const response = await axios.get(`${API_URL}/api/users/${userId}/lists`);
      setLists(response.data);
    } catch (error) {
      console.error("Errore nel caricamento delle liste:", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const handleCreateList = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/lists`,
        { title, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setTitle("");
      setDescription("");
      setIsFormOpen(false);
      fetchLists();
    } catch (error) {
      alert(error.response?.data?.message || "Errore nella creazione.");
    }
  };

  const handleDeleteList = async (listId) => {
    if (window.confirm("Sei sicuro di voler eliminare questa lista?")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/api/lists/${listId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchLists();
      } catch (error) {
        alert(error.response?.data?.message || "Errore durante l'eliminazione.");
      }
    }
  };

  if (loading) return (
    <div className={styles.pageContainer}>
      <div className={styles.listsGrid}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonListCard key={i} />)}
      </div>
    </div>
  );

  const isWatchlist = (list) => list.id === "watchlist" || list._id === "watchlist";

  return (
    <div className={styles.pageContainer}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>🗂️</span>
          <h1 className={styles.pageTitle}>Le mie Liste</h1>
        </div>
        <button
          className={`${styles.newListBtn} ${isFormOpen ? styles.newListBtnActive : ""}`}
          onClick={() => setIsFormOpen(!isFormOpen)}
        >
          <FaPlus style={{ transition: "transform 0.2s", transform: isFormOpen ? "rotate(45deg)" : "none" }} />
          <span>{isFormOpen ? "Annulla" : "Nuova Lista"}</span>
        </button>
      </div>

      {/* Form creazione lista */}
      {isFormOpen && (
        <div className={styles.createForm}>
          <form onSubmit={handleCreateList}>
            <input
              type="text"
              placeholder="Nome della lista…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={styles.inputField}
              required
              autoFocus
            />
            <textarea
              placeholder="Descrizione (opzionale)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={styles.textareaField}
            />
            <button type="submit" className={styles.submitBtn}>
              Crea Lista
            </button>
          </form>
        </div>
      )}

      {/* Griglia liste: Watchlist e Custom */}
      <div className={styles.listsGrid}>
        {/* Card Watchlist fissa */}
        <div className={`${styles.listCard} ${styles.watchlistCard}`}>
          <Link to="/watchlist" className={styles.listLink}>
            <div className={styles.cardIcon}>
              <FaBookmark />
            </div>
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>Watchlist</h3>
              <p className={styles.cardDesc}>I film che vuoi guardare</p>
            </div>
          </Link>
        </div>

        {/* Liste dell'utente filtrate dalla watchlist (già esposta sopra staticamente) */}
        {lists
          .filter(list => list._id !== "watchlist" && list.id !== "watchlist")
          .map((list) => (
          <div key={list._id} className={styles.listCard}>
            <Link to={`/list/${list._id}`} className={styles.listLink}>
              <div className={styles.cardIcon}>
                <FaFilm />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{list.title}</h3>
                {list.description && (
                  <p className={styles.cardDesc}>{list.description}</p>
                )}
              </div>
            </Link>
            <button
              onClick={() => handleDeleteList(list._id)}
              className={styles.deleteButton}
              title="Elimina lista"
            >
              <FaTrash />
            </button>
          </div>
        ))}
      </div>

      {lists.length === 0 && (
        <div className={styles.emptyState}>
          <p>Non hai ancora creato nessuna lista personalizzata.</p>
          <p className={styles.emptyHint}>Premi "Nuova Lista" per iniziare!</p>
        </div>
      )}
    </div>
  );
}

export default MyListsPage;