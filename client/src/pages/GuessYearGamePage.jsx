import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./GuessYearGamePage.module.css";
import { FaPlay, FaCalendarAlt, FaTrophy, FaMedal, FaArrowLeft, FaInfoCircle } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";
import { SkeletonWithLogo } from "../components/Skeleton";

const API_URL = import.meta.env.VITE_API_URL || "";

function GuessYearGamePage() {
  const navigate = useNavigate();
  const [myScore, setMyScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lbError, setLbError] = useState(false);

  const token = localStorage.getItem("token");
  let userId = null;
  try { if (token) userId = jwtDecode(token).user.id; } catch {}

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLbError(false);

      try {
        if (token) {
          const scoreRes = await axios.get(`${API_URL}/api/guess-year/my-score`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setMyScore(scoreRes.data.score || 0);
        }

        const lbRes = await axios.get(`${API_URL}/api/guess-year/leaderboard`);
        setLeaderboard(lbRes.data);
      } catch (err) {
        console.error("Errore caricamento guess-year data:", err);
        setLbError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const rankEmojis = ["🥇", "🥈", "🥉"];
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  if (loading) return <SkeletonWithLogo />;

  return (
    <div className={styles.page}>
      {/* Header with Back Button */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div className={styles.titleContent}>
            <h1 className={styles.title}>
              Quale <span className={styles.titleHighlight}>Anno?</span>
            </h1>
            <p className={styles.subtitle}>Indovina l'anno di uscita dei Blockbuster</p>
          </div>
        </div>
      </div>

      {/* Personal Stats */}
      {userId && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statIconContainer}>
              <FaTrophy />
            </div>
            <div>
              <p className={styles.statLabel}>Best Score</p>
              <p className={styles.statValue}>{myScore}</p>
            </div>
          </div>
        </div>
      )}

      {/* Play Button */}
      <div className={styles.playSection}>
        <button
          className={styles.playBtn}
          onClick={() => navigate("/guess-year/play")}
        >
          <div className={styles.playBtnIcon}><FaPlay /></div>
          <div className={styles.playBtnText}>
            <span className={styles.playBtnTitle}>Gioca Ora</span>
            <span className={styles.playBtnDesc}>Metti alla prova la tua memoria</span>
          </div>
          <span className={styles.playArrow}>›</span>
        </button>
      </div>

      {/* How to Play */}
      <div className={styles.howToPlay}>
        <div className={styles.step}>
          <div className={styles.stepNum}>1</div>
          <span>Ti verranno mostrate le locandine di <strong>8 film</strong> iconici e famosissimi.</span>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNum}>2</div>
          <span>Per ogni film, indovina il suo anno di uscita esatto digitandolo.</span>
        </div>
        <div className={styles.step}>
          <div className={styles.stepNum}>3</div>
          <span>Esatto: <strong>+10 pt</strong> | Sbagli di 3: <strong>+7</strong> | Sbagli di 5: <strong>+3</strong> | Sbagli &lt;= 10: <strong>+1 pt</strong></span>
        </div>
      </div>

      {/* Leaderboard */}
      <div className={styles.leaderboardSection}>
        <div className={styles.lbHeader}>
          <FaMedal className={styles.lbTitleIcon} />
          <h2 className={styles.lbTitle}>Classifica Globale</h2>
        </div>

        <div className={styles.lbList}>
          {lbError ? (
            <div className={styles.lbEmpty}>
              <p>Errore nel caricare la classifica.</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className={styles.lbEmpty}>
              <FaCalendarAlt className={styles.lbEmptyIcon} />
              <p>Nessun utente in classifica. Gioca tu per primo!</p>
            </div>
          ) : (
            leaderboard.map((entry, i) => (
              <div
                key={entry._id}
                className={`${styles.lbRow} ${entry.user?._id === userId ? styles.lbRowMe : ""}`}
              >
                <span
                  className={styles.lbRank}
                  style={{ color: rankColors[i] || "rgba(255,255,255,0.35)" }}
                >
                  {i < 3 ? rankEmojis[i] : `#${i + 1}`}
                </span>
                <img
                  src={
                    entry.user?.avatar_url ||
                    `https://api.dicebear.com/7.x/initials/svg?seed=${entry.user?.username}&backgroundColor=1a1a2e`
                  }
                  alt={entry.user?.username}
                  className={styles.lbAvatar}
                />
                <span className={styles.lbUsername}>@{entry.user?.username}</span>
                <span className={styles.lbScore}>{entry.score} pt</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default GuessYearGamePage;
