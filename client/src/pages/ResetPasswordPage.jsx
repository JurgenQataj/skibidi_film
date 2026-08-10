import React, { useState } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import styles from "../components/LoginPage.module.css";
import { Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react";

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      
      setMessage("Password aggiornata! Reindirizzamento al login...");
      setTimeout(() => navigate("/login"), 2500);
      
    } catch (err) {
      setError(err.response?.data?.message || "Link scaduto o non valido.");
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
          <h2>Nuova Password</h2>
          <p className={styles.brandSubtitle}>Scegli una nuova password sicura</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="reset-pass">Nuova Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="reset-pass"
                className={`${styles.inputField} ${styles.inputFieldWithToggle}`}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
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

          <div className={styles.inputGroup}>
            <label htmlFor="confirm-pass">Conferma Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="confirm-pass"
                className={styles.inputField}
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
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
                <span>Aggiorna Password</span>
                <CheckCircle2 size={18} />
              </>
            )}
          </button>

          <p className={styles.authFooter}>
            <Link to="/login">Torna al Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default ResetPasswordPage;