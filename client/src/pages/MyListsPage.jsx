import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { Link } from "react-router-dom";
import styles from "./MyListsPage.module.css";

function MyListsPage() {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

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

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

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

  if (loading) return <p className={styles.statusText}>Caricamento...</p>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.createListSection}>
        <h2>Crea una Nuova Lista</h2>
        <form onSubmit={handleCreateList}>
          <input
            type="text"
            placeholder="Titolo della lista"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.inputField}
            required
          />
          <textarea
            placeholder="Descrizione (opzionale)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.textareaField}
          />
          <button type="submit" className={styles.button}>
            Crea Lista
          </button>
        </form>
      </div>

      <div className={styles.myListsSection}>
        <h2>Le Mie Liste</h2>
        {lists.length > 0 ? (
          <div className={styles.listsContainer}>
            {lists.map((list) => (
              <div
                key={list._id} /* CORREZIONE: Usiamo _id di MongoDB */
                className={`${styles.listCard} ${
                  list.id === "watchlist" || list._id === "watchlist" ? styles.watchlistCard : ""
                }`}
              >
                <Link
                  to={
                    list.id === "watchlist" || list._id === "watchlist" 
                      ? "/watchlist" 
                      : `/list/${list._id}`
                  }
                  className={styles.listLink}
                >
                  <h3>{list.title}</h3>
                  <p>{list.description}</p>
                </Link>
                {/* Mostra il tasto elimina solo se NON è la watchlist */}
                {list.id !== "watchlist" && list._id !== "watchlist" && (
                  <button
                    onClick={() => handleDeleteList(list._id)}
                    className={styles.deleteButton}
                    title="Elimina lista"
                  >
                    X
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.statusText}>
            Non hai ancora creato nessuna lista.
          </p>
        )}
      </div>
    </div>
  );
}

export default MyListsPage;