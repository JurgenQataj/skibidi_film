import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./GuessActorGamePage.module.css";
import { FaTrophy, FaMedal, FaArrowLeft, FaEyeSlash } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";

const API_URL = import.meta.env.VITE_API_URL || "";

function GuessActorGamePage() {
  const navigate = useNavigate();
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);

  const token = localStorage.getItem("token");
  let userId = null;
  try { if (token) userId = jwtDecode(token).user.id; } catch {}

  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_URL}/api/guess-actor/my-score`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setMyScore(r.data.score))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    setLbLoading(true);
    axios
      .get(`${API_URL}/api/guess-actor/leaderboard`)
      .then((r) => setLeaderboard(r.data))
      .catch(() => setLeaderboard([]))
      .finally(() => setLbLoading(false));
  }, []);

  const rankEmojis = ["🥇", "🥈", "🥉"];
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div className={styles.titleContent}>
            <h1 className={styles.title}>
              <span className={styles.titleHighlight}>Chi è?</span>
            </h1>
            <p className={styles.subtitle}>Indovina l'attore dal volto pixelato</p>
          </div>
        </div>
      </div>

      {/* Come si gioca */}
      <div className={styles.howToPlay}>
        <div className={styles.step}><span className={styles.stepNum}>1</span><span>Vedi la foto sfocata, che si schiarisce ogni 3s</span></div>
        <div className={styles.step}><span className={styles.stepNum}>2</span><span>Scrivi il COGNOME dell'attore. Hai 3 tentativi!</span></div>
        <div className={styles.step}><span className={styles.stepNum}>3</span><span>Più veloce indovini (foto più sfocata), più punti ottieni!</span></div>
      </div>

      {/* Punteggio personale */}
      {userId && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <FaEyeSlash className={styles.statIcon} />
            <div>
              <p className={styles.statLabel}>Il tuo record</p>
              <p className={styles.statValue}>{myScore}</p>
            </div>
          </div>
        </div>
      )}

      {/* Play button */}
      <div className={styles.playSection}>
        <button
          className={styles.playBtn}
          onClick={() => navigate("/guess-actor/play")}
        >
          <div className={styles.playBtnIcon}><FaEyeSlash /></div>
          <div className={styles.playBtnText}>
            <span className={styles.playBtnTitle}>Gioca!</span>
            <span className={styles.playBtnDesc}>Avvia partita (6 attori)</span>
          </div>
          <span className={styles.playArrow}>›</span>
        </button>
      </div>

      {/* Leaderboard */}
      <div className={styles.leaderboardSection}>
        <div className={styles.lbHeader}>
          <FaTrophy className={styles.lbTitleIcon} />
          <h2 className={styles.lbTitle}>Classifica</h2>
        </div>
        <div className={styles.lbList}>
          {lbLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${styles.lbRow} ${styles.lbSkeleton}`} />
            ))
          ) : leaderboard.length === 0 ? (
            <div className={styles.lbEmpty}>
              <FaMedal className={styles.lbEmptyIcon} />
              <p>Nessun punteggio. Gioca per primo!</p>
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <div
                key={entry._id}
                className={`${styles.lbRow} ${entry.user?._id === userId ? styles.lbRowMe : ""}`}
              >
                <span className={styles.lbRank} style={{ color: rankColors[i] || "rgba(255,255,255,0.35)" }}>
                  {i < 3 ? rankEmojis[i] : `#${i + 1}`}
                </span>
                <img
                  src={entry.user?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${entry.user?.username}&backgroundColor=1a1a2e`}
                  alt={entry.user?.username}
                  className={styles.lbAvatar}
                />
                <span className={styles.lbUsername}>@{entry.user?.username}</span>
                <span className={styles.lbScore}>{entry.score}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <p className={styles.poweredBy}>Powered by <span className={styles.brand}>Skibidi Film</span></p>
      </footer>
    </div>
  );
}

export default GuessActorGamePage;
