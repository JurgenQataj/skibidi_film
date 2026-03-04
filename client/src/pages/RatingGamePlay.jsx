import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import styles from "./RatingGamePlay.module.css";
import { FaArrowLeft, FaStar, FaDollarSign, FaFire } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

function formatRevenue(value) {
  if (!value || value === 0) return "N/D";
  if (value >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString()}`;
}

function RatingGamePlay() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "rating"; // "rating" | "boxoffice"

  const [pair, setPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem(`ratingGame_hs_${mode}`) || "0")
  );
  const [result, setResult] = useState(null); // null | "correct" | "wrong"
  const [revealed, setRevealed] = useState(false);
  const [chosen, setChosen] = useState(null); // "A" | "B"
  const [usedIds, setUsedIds] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const isRating = mode === "rating";
  const modeLabel = isRating ? "Rating" : "Box Office";
  const modeIcon = isRating ? <FaStar /> : <FaDollarSign />;

  const fetchPair = useCallback(async (exclude = []) => {
    setLoading(true);
    setResult(null);
    setRevealed(false);
    setChosen(null);
    try {
      const res = await axios.get(`${API_URL}/api/rating-game/pair`, {
        params: {
          mode,
          exclude: exclude.slice(-20).join(","),
        },
      });
      setPair(res.data);
      setUsedIds((prev) => [
        ...prev,
        res.data.movieA.id,
        res.data.movieB.id,
      ]);
    } catch (err) {
      console.error("Error fetching pair:", err);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchPair([]);
  }, [fetchPair]);

  const getScore = (movie) =>
    isRating ? movie.vote_average : (movie.revenue || 0);

  const handleChoice = (choice) => {
    if (revealed || isAnimating) return;
    setChosen(choice);
    setIsAnimating(true);

    const movieA = pair.movieA;
    const movieB = pair.movieB;
    const scoreA = getScore(movieA);
    const scoreB = getScore(movieB);

    let correctChoice;
    if (scoreA > scoreB) correctChoice = "A";
    else if (scoreB > scoreA) correctChoice = "B";
    else correctChoice = choice; // tie = always correct

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
          localStorage.setItem(`ratingGame_hs_${mode}`, newStreak);
        }
      } else {
        setStreak(0);
        setResult("wrong");
      }
    }, 400);
  };

  const handleNext = () => {
    if (result === "wrong") {
      // Game over — go back to menu
      navigate("/rating-game");
      return;
    }
    fetchPair(usedIds);
  };

  const getValue = (movie) => {
    if (isRating) return `⭐ ${movie.vote_average.toFixed(1)}`;
    return `💰 ${formatRevenue(movie.revenue)}`;
  };

  const renderCard = (movie, side) => {
    const scoreA = pair ? getScore(pair.movieA) : 0;
    const scoreB = pair ? getScore(pair.movieB) : 0;
    const isWinner =
      side === "A" ? scoreA >= scoreB : scoreB >= scoreA;
    const isChosen = chosen === side;

    let cardClass = styles.movieCard;
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
        disabled={revealed}
        key={movie.id}
      >
        <div className={styles.cardInner}>
          <p className={styles.movieTitle}>
            {movie.title}{" "}
            <span className={styles.year}>
              ({movie.release_date?.substring(0, 4)})
            </span>
          </p>
          <div className={styles.posterWrapper}>
            <img
              src={`${TMDB_IMAGE}${movie.poster_path}`}
              alt={movie.title}
              className={styles.poster}
            />
            {revealed && (
              <div className={styles.valueOverlay}>
                <span className={styles.valueText}>{getValue(movie)}</span>
              </div>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/rating-game")}>
          <FaArrowLeft />
        </button>
        <div className={styles.scoreInfo}>
          <span className={styles.scoreItem}>
            🏆 Best: <strong>{highScore}</strong>
          </span>
          <span className={styles.scoreItem}>
            <FaFire className={styles.fireIcon} /> Streak:{" "}
            <strong>{streak}</strong>
          </span>
        </div>
      </div>

      {/* Prompt */}
      <div className={styles.prompt}>
        <span className={styles.promptText}>
          Quale ha il {modeLabel} più alto?
        </span>
        <span className={styles.modeIconBadge}>{modeIcon}</span>
      </div>

      {/* Cards */}
      <div className={styles.cards}>
        {loading ? (
          <>
            <div className={`${styles.movieCard} ${styles.skeleton}`} />
            <div className={styles.vs}>VS</div>
            <div className={`${styles.movieCard} ${styles.skeleton}`} />
          </>
        ) : pair ? (
          <>
            {renderCard(pair.movieA, "A")}
            <div className={styles.vs}>VS</div>
            {renderCard(pair.movieB, "B")}
          </>
        ) : (
          <p className={styles.errorMsg}>Errore nel caricare i film. Riprova.</p>
        )}
      </div>

      {/* Result + Next */}
      {revealed && (
        <div className={`${styles.resultBar} ${result === "correct" ? styles.resultCorrect : styles.resultWrong}`}>
          <span className={styles.resultEmoji}>
            {result === "correct" ? "✅ Corretto!" : "❌ Sbagliato!"}
          </span>
          <button className={styles.nextBtn} onClick={handleNext}>
            {result === "correct" ? "Avanti →" : "Ricomincia"}
          </button>
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
