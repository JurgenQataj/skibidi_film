import React, { useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import styles from "../components/LoginPage.module.css";

function ResetPasswordPage() {
  const { token } = useParams(); // Prende il token dall'URL
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Le password non coincidono.");
    }

    setLoading(true);
    setError("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      await axios.post(`${API_URL}/api/users/reset-password/${token}`, { password });
      
      setMessage("Password aggiornata con successo! Reindirizzamento al login...");
      setTimeout(() => navigate("/login"), 3000);
      
    } catch (err) {
      setError(err.response?.data?.message || "Link scaduto o non valido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h2>Imposta Nuova Password</h2>

        <div className={styles.inputGroup}>
          <label>Nuova Password:</label>
          <input
            className={styles.inputField}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label>Conferma Password:</label>
          <input
            className={styles.inputField}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {message && <p style={{ color: "lightgreen", textAlign: "center" }}>{message}</p>}
        {error && <p style={{ color: "#ff8a8a", textAlign: "center" }}>{error}</p>}

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? "Salvataggio..." : "Aggiorna Password"}
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;