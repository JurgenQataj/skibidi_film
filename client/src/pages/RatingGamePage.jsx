import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./RatingGamePage.module.css";
import { FaStar, FaDollarSign, FaTrophy, FaGamepad, FaMedal, FaArrowLeft, FaEyeSlash } from "react-icons/fa";
import { jwtDecode } from "jwt-decode";

const API_URL = import.meta.env.VITE_API_URL || "";

function RatingGamePage() {
  const navigate = useNavigate();
  const [myScores, setMyScores] = useState({ rating: 0, boxoffice: 0 });
  const [activeTab, setActiveTab] = useState("rating");
  const [leaderboard, setLeaderboard] = useState([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [lbError, setLbError] = useState(false);

  const token = localStorage.getItem("token");
  let userId = null;
  try { if (token) userId = jwtDecode(token).user.id; } catch {}

  // Load personal scores
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API_URL}/api/rating-game/my-scores`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setMyScores(r.data))
      .catch(() => {});
  }, [token]);

  // Load leaderboard when tab changes
  useEffect(() => {
    setLbLoading(true);
    setLbError(false);
    axios
      .get(`${API_URL}/api/rating-game/leaderboard`, { params: { mode: activeTab } })
      .then((r) => setLeaderboard(r.data))
      .catch(() => { setLeaderboard([]); setLbError(true); })
      .finally(() => setLbLoading(false));
  }, [activeTab]);

  const rankEmojis = ["🥇", "🥈", "🥉"];
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div className={styles.page}>
      {/* Header with Back Button and Original Title */}
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <FaArrowLeft />
          </button>
          <div className={styles.titleContent}>
            <h1 className={styles.title}>
              The <span className={styles.titleHighlight}>Rating</span> Game
            </h1>
          </div>
        </div>
      </div>

      {/* Personal Stats */}
      {userId && (
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <FaStar className={styles.statIconRed} />
            <div>
              <p className={styles.statLabel}>Best Rating</p>
              <p className={styles.statValue}>{myScores.rating}</p>
            </div>
          </div>
          <div className={styles.statCard}>
            <FaDollarSign className={styles.statIconGreen} />
            <div>
              <p className={styles.statLabel}>Best Box Office</p>
              <p className={styles.statValue}>{myScores.boxoffice}</p>
            </div>
          </div>
        </div>
      )}

      {/* Play Buttons */}
      <div className={styles.playSection}>
        <button
          className={`${styles.playBtn} ${styles.ratingBtn}`}
          onClick={() => navigate("/rating-game/play?mode=rating")}
        >
          <div className={styles.playBtnIcon}><FaStar /></div>
          <div className={styles.playBtnText}>
            <span className={styles.playBtnTitle}>Play Rating</span>
            <span className={styles.playBtnDesc}>Quale film ha il voto più alto?</span>
          </div>
          <span className={styles.playArrow}>›</span>
        </button>

        <button
          className={`${styles.playBtn} ${styles.boxofficeBtn}`}
          onClick={() => navigate("/rating-game/play?mode=boxoffice")}
        >
          <div className={styles.playBtnIcon}><FaDollarSign /></div>
          <div className={styles.playBtnText}>
            <span className={styles.playBtnTitle}>Play Box Office</span>
            <span className={styles.playBtnDesc}>Quale film ha incassato di più?</span>
          </div>
          <span className={styles.playArrow}>›</span>
        </button>

        <button
          className={`${styles.playBtn} ${styles.ageBtn}`}
          onClick={() => navigate("/actor-age-game")}
        >
          <div className={styles.playBtnIcon}>👴</div>
          <div className={styles.playBtnText}>
            <span className={styles.playBtnTitle}>Indovina il Giovane</span>
            <span className={styles.playBtnDesc}>Quale attore è più giovane?</span>
          </div>
          <span className={styles.playArrow}>›</span>
        </button>

        <button
          className={`${styles.playBtn} ${styles.ageBtn}`}
          onClick={() => navigate("/guess-actor")}
        >
          <div className={styles.playBtnIcon}><FaEyeSlash /></div>
          <div className={styles.playBtnText}>
            <span className={styles.playBtnTitle}>Chi è?</span>
            <span className={styles.playBtnDesc}>Indovina l'attore pixelato</span>
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

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === "rating" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("rating")}
          >
            <FaStar /> Rating
          </button>
          <button
            className={`${styles.tab} ${activeTab === "boxoffice" ? styles.tabActive : ""}`}
            onClick={() => setActiveTab("boxoffice")}
          >
            <FaDollarSign /> Box Office
          </button>
        </div>

        <div className={styles.lbList}>
          {lbLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`${styles.lbRow} ${styles.lbSkeleton}`} />
            ))
          ) : lbError ? (
            <div className={styles.lbEmpty}>
              <p>Errore nel caricare la classifica.</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className={styles.lbEmpty}>
              <FaMedal className={styles.lbEmptyIcon} />
              <p>Nessun punteggio ancora. Gioca per primo!</p>
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
                <span className={styles.lbScore}>{entry.score}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.poweredBy}>
          Powered by <span className={styles.brand}>Skibidi Film</span>
        </p>
      </footer>
    </div>
  );
}

export default RatingGamePage;
