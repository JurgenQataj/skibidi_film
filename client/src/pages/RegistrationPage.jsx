import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "../components/LoginPage.module.css";

function RegistrationPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password || !inviteCode) {
      setError("Tutti i campi sono obbligatori.");
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await axios.post(`${API_URL}/api/users/register`, {
        username,
        password,
        inviteCode,
      });
      setSuccess(response.data.message + " Ora puoi fare il login.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Errore durante la registrazione."
      );
    }
  };

  return (
    <form onSubmit={handleRegister} className={styles.loginContainer}>
      <h2>Registrati</h2>
      <div className={styles.inputGroup}>
        <label>Username:</label>
        <input
          className={styles.inputField}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className={styles.inputGroup}>
        <label>Password:</label>
        <input
          className={styles.inputField}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className={styles.inputGroup}>
        <label>Codice d'Invito:</label>
        <input
          className={styles.inputField}
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
        />
      </div>

      {error && <p style={{ color: "#ff8a8a" }}>{error}</p>}
      {success && <p style={{ color: "#8aff8a" }}>{success}</p>}

      <button type="submit" className={styles.submitButton}>
        Registrati
      </button>
      <p style={{ marginTop: "15px" }}>
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </form>
  );
}

export default RegistrationPage;
