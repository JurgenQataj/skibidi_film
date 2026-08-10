import React, { useState } from "react";
import axios from "axios";
import useAuthStore from "../store/useAuthStore";
import { useNavigate, Link } from "react-router-dom";
import styles from "../components/LoginPage.module.css";
import { User, Mail, Lock, KeyRound, Eye, EyeOff, UserPlus } from "lucide-react";

function RegistrationPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const API_URL = import.meta.env.VITE_API_URL || "";
      
      const response = await axios.post(`${API_URL}/api/users/register`, {
        username,
        email, 
        password,
        inviteCode,
      });

      login(response.data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Errore durante la registrazione.");
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
          <h2>Crea Account</h2>
          <p className={styles.brandSubtitle}>Unisciti a Skibidi Film</p>
        </div>

        <form onSubmit={handleRegister} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="reg-username">Username</label>
            <div className={styles.inputWrapper}>
              <User size={18} className={styles.inputIcon} />
              <input
                id="reg-username"
                className={styles.inputField}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={12}
                placeholder="Username..."
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="reg-email">Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={18} className={styles.inputIcon} />
              <input
                id="reg-email"
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

          <div className={styles.inputGroup}>
            <label htmlFor="reg-password">Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={18} className={styles.inputIcon} />
              <input
                id="reg-password"
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
            <label htmlFor="reg-invite">Codice Invito (Opzionale)</label>
            <div className={styles.inputWrapper}>
              <KeyRound size={18} className={styles.inputIcon} />
              <input
                id="reg-invite"
                className={styles.inputField}
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Codice..."
              />
            </div>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                <span>Registrati</span>
                <UserPlus size={18} />
              </>
            )}
          </button>

          <p className={styles.authFooter}>
            Hai già un account? <Link to="/login">Accedi</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default RegistrationPage;