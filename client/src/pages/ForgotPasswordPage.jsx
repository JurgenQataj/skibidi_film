import React, { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import styles from "../components/LoginPage.module.css"; // Riutilizziamo lo stile del login

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
      setMessage(response.data.message); // "Email inviata!"
    } catch (err) {
      setError(err.response?.data?.message || "Errore nell'invio della richiesta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <h2>Recupera Password</h2>
        <p style={{textAlign: 'center', marginBottom: '15px', color: '#ccc'}}>
          Inserisci la tua email. Ti invieremo un link per resettare la password.
        </p>

        <div className={styles.inputGroup}>
          <label>Email:</label>
          <input
            className={styles.inputField}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="La tua email"
          />
        </div>

        {message && <p style={{ color: "lightgreen", textAlign: "center" }}>{message}</p>}
        {error && <p style={{ color: "#ff8a8a", textAlign: "center" }}>{error}</p>}

        <button type="submit" className={styles.submitButton} disabled={loading}>
          {loading ? "Invio in corso..." : "Invia Link di Reset"}
        </button>

        <p style={{ marginTop: "15px", textAlign: "center" }}>
          <Link to="/login">Torna al Login</Link>
        </p>
      </form>
    </div>
  );
}

export default ForgotPasswordPage;