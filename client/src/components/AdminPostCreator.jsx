import React, { useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import styles from "./AdminPostCreator.module.css";

function AdminPostCreator({ onPostCreated }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    // Solo Juri01 può vedere questo componente
    if (decoded.user.username !== "Juri01") {
      return null;
    }
  } catch (err) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      await axios.post(
        `${API_URL}/api/posts`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setText("");
      if (onPostCreated) {
        onPostCreated(); // triggera un refresh del feed
      }
    } catch (error) {
      console.error("Errore creazione post:", error);
      alert("Errore nella creazione del post admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>📢 Crea Annuncio Admin (Visibile a tutti per 7gg)</h3>
      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          placeholder="Scrivi qui il tuo annuncio ufficiale..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          disabled={loading}
        />
        <button type="submit" className={styles.submitBtn} disabled={loading || !text.trim()}>
          {loading ? "Invio in corso..." : "Pubblica Annuncio"}
        </button>
      </form>
    </div>
  );
}

export default AdminPostCreator;
