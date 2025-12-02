import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import styles from "../components/LoginPage.module.css"; // Usiamo lo stesso stile del login

function RegistrationPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState(""); // <--- NUOVO STATO
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      
      // Ora inviamo anche l'email!
      const response = await axios.post(`${API_URL}/api/users/register`, {
        username,
        email, 
        password,
        inviteCode,
      });

      // Login automatico dopo la registrazione
      login(response.data.token);
      navigate("/");
      
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante la registrazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className={styles.loginContainer}>
      <h2>Registrazione</h2>
      
      <div className={styles.inputGroup}>
        <label>Username:</label>
        <input
          className={styles.inputField}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      {/* NUOVO CAMPO EMAIL */}
      <div className={styles.inputGroup}>
        <label>Email (per recupero password):</label>
        <input
          className={styles.inputField}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tua@email.com"
        />
      </div>

      <div className={styles.inputGroup}>
        <label>Password:</label>
        <input
          className={styles.inputField}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <div className={styles.inputGroup}>
        <label>Codice Invito (Opzionale):</label>
        <input
          className={styles.inputField}
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
      </div>

      {error && <p style={{ color: "#ff8a8a" }}>{error}</p>}

      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? "Caricamento..." : "Registrati"}
      </button>

      <p style={{ marginTop: "15px" }}>
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </form>
  );
}

export default RegistrationPage;