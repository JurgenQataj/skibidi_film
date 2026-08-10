import React, { useState } from "react";
import axios from "axios";
import useAuthStore from "../store/useAuthStore";
import { useNavigate, Link } from "react-router-dom";
import styles from "../components/LoginPage.module.css";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
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
    <div className={styles.pageWrapper}>
      <div className={styles.glowOrbTop} />
      <div className={styles.glowOrbBottom} />

      <div className={styles.loginContainer}>
        <div className={styles.brandHeader}>
          <img src="/icona3.png" alt="Skibidi Film Logo" className={styles.brandLogo} />
          <h2>Bentornato</h2>
          <p className={styles.brandSubtitle}>Accedi al tuo account per continuare</p>
        </div>

        <form onSubmit={handleLogin} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="login-username">Username o Email</label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input
                id="login-username"
                className={styles.inputField}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username o email..."
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="login-password">Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="login-password"
                className={`${styles.inputField} ${styles.inputFieldWithToggle}`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Nascondi password" : "Mostra password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.linksRow}>
            <Link to="/forgot-password" className={styles.forgotPasswordLink}>
              Password dimenticata?
            </Link>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span>Accedi</span>
                <LogIn size={18} />
              </>
            )}
          </button>

          <p className={styles.authFooter}>
            Non hai un account? <Link to="/register">Registrati</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;