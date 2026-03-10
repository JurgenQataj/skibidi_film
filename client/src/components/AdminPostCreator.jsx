import React, { useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import styles from "./AdminPostCreator.module.css";

function AdminPostCreator({ onPostCreated }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
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
      setIsExpanded(false); // Chiudi dopo la creazione
    } catch (error) {
      console.error("Errore creazione post:", error);
      alert("Errore nella creazione del post admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div 
        className={styles.header} 
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
      >
        <h3 className={styles.title}>📢 Crea Annuncio Admin (7days)</h3>
        <div className={styles.toggleBtn}>
          {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>
      
      {isExpanded && (
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
      )}
    </div>
  );
}

export default AdminPostCreator;
