import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import styles from "../components/LoginPage.module.css";
import { Mail, Send, ArrowLeft } from "lucide-react";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      const response = await axios.post(`${API_URL}/api/users/forgot-password`, { email });
      setMessage(response.data.message || "Email di reset inviata con successo!");
    } catch (err) {
      setError(err.response?.data?.message || "Errore nell'invio della richiesta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.glowOrbTop} />
      <div className={styles.glowOrbBottom} />

      <div className={styles.loginContainer}>
        <div className={styles.brandHeader}>
          <img src="/icona3.png" alt="Skibidi Film Logo" className={styles.brandLogo} />
          <h2>Recupera Password</h2>
          <p className={styles.brandSubtitle}>
            Inserisci la tua email per ricevere le istruzioni
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="forgot-email">Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="forgot-email"
                className={styles.inputField}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tua@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {message && <div className={styles.successMessage}>{message}</div>}
          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span>Invia Link</span>
                <Send size={18} />
              </>
            )}
          </button>

          <p className={styles.authFooter} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <ArrowLeft size={16} style={{ color: "#e50914" }} />
            <Link to="/login">Torna al Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;