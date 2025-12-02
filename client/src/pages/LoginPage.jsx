import React, { useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import styles from "../components/LoginPage.module.css";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      // Nota: Il backend ora supporta login sia con username che email
      const response = await axios.post(`${API_URL}/api/users/login`, {
        username,
        password,
      });
      login(response.data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante il login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className={styles.loginContainer}>
      <h2>Login</h2>
      <div className={styles.inputGroup}>
        <label>Username o Email:</label>
        <input
          className={styles.inputField}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
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
      {error && <p style={{ color: "#ff8a8a" }}>{error}</p>}
      
      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? "Caricamento..." : "Accedi"}
      </button>

      {/* NUOVO LINK RECUPERO PASSWORD */}
      <div style={{ marginTop: "10px", textAlign: "right" }}>
        <Link to="/forgot-password" style={{ fontSize: "0.9rem", color: "#aaa", textDecoration: "none" }}>
          Password dimenticata?
        </Link>
      </div>

      <p style={{ marginTop: "20px", textAlign: 'center' }}>
        Non hai un account? <Link to="/register">Registrati</Link>
      </p>
    </form>
  );
}
export default LoginPage;