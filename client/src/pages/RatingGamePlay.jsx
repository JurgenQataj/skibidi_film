import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./RatingGamePlay.module.css";
import { FaArrowLeft, FaStar, FaDollarSign, FaFire, FaTrophy } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w780";

function formatRevenue(value) {
  if (!value || value === 0) return "N/D";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function RatingGamePlay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "rating";

  const [pair, setPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem(`ratingGame_hs_${mode}`) || "0")
  );
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [usedIds, setUsedIds] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [newRecord, setNewRecord] = useState(false);

  const token = localStorage.getItem("token");
  const isRating = mode === "rating";
  const modeLabel = isRating ? "Rating" : "Box Office";

  const fetchPair = useCallback(async (exclude = []) => {
    setLoading(true);
    setResult(null);
    setRevealed(false);
    setChosen(null);
    setNewRecord(false);
    try {
      const res = await axios.get(`${API_URL}/api/rating-game/pair`, {
        params: { mode, exclude: exclude.slice(-20).join(",") },
      });
      setPair(res.data);
      setUsedIds((prev) => [...prev, res.data.movieA.id, res.data.movieB.id]);
    } catch (err) {
      console.error("Error fetching pair:", err);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  const hasFetched = React.useRef(false);
  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchPair([]);
    }
  }, [fetchPair]);

  const submitScore = useCallback(async (score) => {
    if (!token || score === 0) return;
    try {
      await axios.post(`${API_URL}/api/rating-game/score`, { mode, score }, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) { console.error("Score submit error:", err); }
  }, [token, mode]);

  const getScore = (movie) => isRating ? movie.vote_average : (movie.revenue || 0);

  const handleChoice = (choice) => {
    if (revealed || isAnimating || gameOver) return;
    setChosen(choice);
    setIsAnimating(true);

    const scoreA = getScore(pair.movieA);
    const scoreB = getScore(pair.movieB);
    let correctChoice;
    if (scoreA > scoreB) correctChoice = "A";
    else if (scoreB > scoreA) correctChoice = "B";
    else correctChoice = choice;

    const isCorrect = choice === correctChoice;

    setTimeout(() => {
      setRevealed(true);
      setIsAnimating(false);
      if (isCorrect) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        setResult("correct");
        if (newStreak > highScore) {
          setHighScore(newStreak);
          setNewRecord(true);
          localStorage.setItem(`ratingGame_hs_${mode}`, newStreak);
          submitScore(newStreak);
        }
        // Auto-procede dopo 1.8 secondi
        setTimeout(() => fetchPair(usedIds), 1800);
      } else {
        setResult("wrong");
        submitScore(streak);
        setTimeout(() => setGameOver(true), 900);
      }
    }, 400);
  };

  const getValue = (movie) => {
    if (isRating) return `⭐ ${movie.vote_average.toFixed(1)}`;
    return `💰 ${formatRevenue(movie.revenue)}`;
  };

  const renderCard = (movie, side) => {
    const scoreA = pair ? getScore(pair.movieA) : 0;
    const scoreB = pair ? getScore(pair.movieB) : 0;
    const isWinner = side === "A" ? scoreA >= scoreB : scoreB >= scoreA;
    const isChosen = chosen === side;

    let cardClass = styles.movieCard;
    // side A slides in from left, side B from right
    cardClass += side === "A" ? ` ${styles.cardLeft}` : ` ${styles.cardRight}`;
    if (revealed) {
      if (isWinner && isChosen) cardClass += ` ${styles.correct}`;
      else if (!isWinner && isChosen) cardClass += ` ${styles.wrong}`;
      else if (isWinner) cardClass += ` ${styles.winner}`;
    }
    if (isChosen && !revealed) cardClass += ` ${styles.selected}`;

    return (
      <button
        className={cardClass}
        onClick={() => handleChoice(side)}
        disabled={revealed || gameOver}
        key={movie.id}
      >
        {/* Poster fills the card */}
        <img
          src={`${TMDB_IMAGE}${movie.poster_path}`}
          alt={movie.title}
          className={styles.poster}
        />

        {/* Bottom gradient + title */}
        <div className={styles.cardGradient} />
        <div className={styles.cardMeta}>
          <p className={styles.movieTitle}>{movie.title}</p>
          <p className={styles.movieYear}>{movie.release_date?.substring(0, 4)}</p>
        </div>

        {/* Tap hint when not revealed */}
        {!revealed && (
          <div className={styles.tapHint}>
            {isRating ? <FaStar /> : <FaDollarSign />}
          </div>
        )}

        {/* Value revealed overlay */}
        {revealed && (
          <div className={styles.valueOverlay}>
            <span className={styles.valueText}>{getValue(movie)}</span>
            {isWinner && <span className={styles.winnerBadge}>✓ Più alto</span>}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/rating-game", { replace: true })}>
          <FaArrowLeft />
        </button>

        <div className={styles.modeTag}>
          {isRating ? <FaStar /> : <FaDollarSign />}
          <span>{modeLabel}</span>
        </div>

        <div className={styles.scoreInfo}>
          {highScore > 0 && (
            <span className={styles.bestBadge}>
              <FaTrophy /> {highScore}
            </span>
          )}
          <div className={styles.streakBadge}>
            <FaFire className={styles.fireIcon} />
            <span>{streak}</span>
          </div>
        </div>
      </div>

      {/* New record flash */}
      {newRecord && (
        <div className={styles.recordBanner}>🎉 Nuovo record: {highScore}!</div>
      )}

      {/* Prompt */}
      <div className={styles.prompt}>
        Quale ha il <strong>{modeLabel}</strong> più alto?
      </div>

      {/* Arena — two cards side by side */}
      <div className={styles.arena}>
        {loading ? (
          <>
            <div className={`${styles.movieCard} ${styles.cardLeft} ${styles.skeleton}`} />
            <div className={styles.vsCenter}>
              <span className={styles.vsText}>VS</span>
            </div>
            <div className={`${styles.movieCard} ${styles.cardRight} ${styles.skeleton}`} />
          </>
        ) : pair ? (
          <>
            {renderCard(pair.movieA, "A")}
            <div className={styles.vsCenter}>
              <span className={styles.vsText}>VS</span>
            </div>
            {renderCard(pair.movieB, "B")}
          </>
        ) : (
          <p className={styles.errorMsg}>Errore. Riprova.</p>
        )}
      </div>

      {/* Result bar */}
      {revealed && !gameOver && result === "correct" && (
        <div className={styles.resultBar}>
          <div className={styles.resultLeft}>
            <span>✅</span>
            <span className={styles.resultText}>Corretto!</span>
            {streak > 1 && <span className={styles.streakBonus}>🔥 ×{streak}</span>}
          </div>
          {/* Pulsante 'Avanti' rimosso, ora procede in automatico */}
        </div>
      )}
      {revealed && result === "wrong" && (
        <div className={`${styles.resultBar} ${styles.resultWrong}`}>
          <span>❌</span>
          <span className={styles.resultText}>Sbagliato!</span>
        </div>
      )}

      {/* Game Over overlay */}
      {gameOver && (
        <div className={styles.gameOverOverlay}>
          <div className={styles.gameOverCard}>
            <p className={styles.gameOverTitle}>Game Over</p>
            <p className={styles.gameOverSubtitle}>Streak finale</p>
            <p className={styles.gameOverScore}>{streak}</p>
            {newRecord && <p className={styles.gameOverRecord}>🎉 Nuovo record!</p>}
            <div className={styles.gameOverBtns}>
              <button
                className={styles.playAgainBtn}
                onClick={() => {
                  setStreak(0);
                  setGameOver(false);
                  setUsedIds([]);
                  fetchPair([]);
                }}
              >
                Riprova
              </button>
              <button className={styles.menuBtn} onClick={() => navigate("/rating-game", { replace: true })}>
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.poweredBy}>
          Powered by <span className={styles.brand}>Skibidi Film</span>
        </p>
      </footer>
    </div>
  );
}

export default RatingGamePlay;
