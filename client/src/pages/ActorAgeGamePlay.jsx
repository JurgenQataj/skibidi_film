import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./ActorAgeGamePlay.module.css";
import { FaArrowLeft, FaBirthdayCake, FaFire, FaTrophy } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w780";

function calcAge(birthday) {
  if (!birthday) return null;
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatBirthday(bday) {
  if (!bday) return "";
  return new Date(bday).toLocaleDateString("it-IT", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function ActorAgeGamePlay() {
  const navigate = useNavigate();

  const [pair, setPair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [streak, setStreak] = useState(0);
  const [highScore, setHighScore] = useState(
    () => parseInt(localStorage.getItem("actorAgeGame_hs") || "0")
  );
  const [newRecord, setNewRecord] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [usedIds, setUsedIds] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  const token = localStorage.getItem("token");

  // Ref sempre aggiornato: evita stale closure nei setTimeout
  const usedIdsRef = useRef([]);
  useEffect(() => { usedIdsRef.current = usedIds; }, [usedIds]);

  const fetchPair = useCallback(async (exclude = []) => {
    setLoading(true);
    setChosen(null);
    setRevealed(false);
    setIsCorrect(null);
    setNewRecord(false);
    setIsAnimating(false);
    try {
      const res = await axios.get(`${API_URL}/api/actor-age-game/pair`, {
        params: { exclude: exclude.slice(-60).join(",") },
      });
      const newPair = res.data;
      setPair(newPair);
      setUsedIds((prev) => {
        const next = [...prev, newPair.actorA.id, newPair.actorB.id];
        usedIdsRef.current = next;
        // Persisti coppia + lista usedIds in sessionStorage
        sessionStorage.setItem(
          "actorAgeSession",
          JSON.stringify({ pair: newPair, usedIds: next, streak: 0 })
        );
        return next;
      });
    } catch (err) {
      console.error("Actor age pair error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Al montaggio: ripristina la sessione dal sessionStorage se presente
  useEffect(() => {
    const saved = sessionStorage.getItem("actorAgeSession");
    if (saved) {
      try {
        const { pair: savedPair, usedIds: savedIds } = JSON.parse(saved);
        if (savedPair) {
          setPair(savedPair);
          setUsedIds(savedIds || []);
          usedIdsRef.current = savedIds || [];
          setLoading(false);
          return; // non fare fetch, usa la coppia salvata
        }
      } catch { /* JSON corrotto, ignora */ }
    }
    fetchPair([]);
  }, [fetchPair]);

  const submitScore = useCallback(async (score) => {
    if (!token || score === 0) return;
    try {
      await axios.post(
        `${API_URL}/api/actor-age-game/score`,
        { score },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) { console.error("Score submit error:", err); }
  }, [token]);

  const handleChoice = (side) => {
    if (revealed || isAnimating || gameOver || !pair) return;
    setChosen(side);
    setIsAnimating(true);

    // Chi è più GIOVANE? Birthday più recente = data più alta = numero timestamp più grande
    const tsA = new Date(pair.actorA.birthday).getTime();
    const tsB = new Date(pair.actorB.birthday).getTime();

    let youngerSide;
    if (tsA > tsB) youngerSide = "A";       // A nato dopo = più giovane
    else if (tsB > tsA) youngerSide = "B";
    else youngerSide = side;                 // stessa età → qualsiasi vada bene

    const correct = side === youngerSide;

    setTimeout(() => {
      setRevealed(true);
      setIsAnimating(false);
      setIsCorrect(correct);

      if (correct) {
        const newStreak = streak + 1;
        setStreak(newStreak);
        // Aggiorna streak nel sessionStorage
        sessionStorage.setItem(
          "actorAgeSession",
          JSON.stringify({ pair, usedIds: usedIdsRef.current, streak: newStreak })
        );
        if (newStreak > highScore) {
          setHighScore(newStreak);
          setNewRecord(true);
          localStorage.setItem("actorAgeGame_hs", newStreak);
          submitScore(newStreak);
        }
        // Usa il ref per avere sempre la lista aggiornata (no stale closure)
        setTimeout(() => fetchPair(usedIdsRef.current), 2000);
      } else {
        submitScore(streak);
        sessionStorage.removeItem("actorAgeSession"); // game over: pulisce sessione
        setTimeout(() => setGameOver(true), 900);
      }
    }, 350);
  };

  const renderCard = (actor, side) => {
    if (!actor) return null;

    const tsA = pair ? new Date(pair.actorA.birthday).getTime() : 0;
    const tsB = pair ? new Date(pair.actorB.birthday).getTime() : 0;
    // Più giovane = birthday più recente = timestamp maggiore
    const isYounger = side === "A" ? tsA >= tsB : tsB >= tsA;
    const isChosen = chosen === side;

    let cardClass = styles.actorCard;
    cardClass += side === "A" ? ` ${styles.cardLeft}` : ` ${styles.cardRight}`;
    if (revealed) {
      if (isYounger && isChosen) cardClass += ` ${styles.correct}`;
      else if (!isYounger && isChosen) cardClass += ` ${styles.wrong}`;
      else if (isYounger) cardClass += ` ${styles.winner}`;
    }
    if (isChosen && !revealed) cardClass += ` ${styles.selected}`;

    return (
      <button
        className={cardClass}
        onClick={() => handleChoice(side)}
        disabled={revealed || gameOver}
        key={actor.id}
      >
        <img
          src={`${TMDB_IMAGE}${actor.profile_path}`}
          alt={actor.name}
          className={styles.poster}
          loading="eager"
        />
        <div className={styles.cardGradient} />

        {/* Nome sempre visibile in basso */}
        <div className={styles.cardMeta}>
          <p className={styles.actorName}>{actor.name}</p>
        </div>

        {/* Tap hint */}
        {!revealed && (
          <div className={styles.tapHint}>🎂</div>
        )}

        {/* Overlay età al reveal */}
        {revealed && (
          <div className={styles.ageOverlay}>
            <span className={styles.birthday}>🎂 {formatBirthday(actor.birthday)}</span>
            <span className={styles.ageVal}>{calcAge(actor.birthday)} anni</span>
            {isYounger && <span className={styles.youngerBadge}>✓ Più giovane</span>}
          </div>
        )}
      </button>
    );
  };

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => navigate("/actor-age-game")}>
          <FaArrowLeft />
        </button>

        <div className={styles.modeTag}>
          <FaBirthdayCake />
          <span>Più Giovane</span>
        </div>

        <div className={styles.scoreInfo}>
          {highScore > 0 && (
            <span className={styles.bestBadge}><FaTrophy /> {highScore}</span>
          )}
          <div className={styles.streakBadge}>
            <FaFire className={styles.fireIcon} />
            <span>{streak}</span>
          </div>
        </div>
      </div>

      {/* Record banner */}
      {newRecord && (
        <div className={styles.recordBanner}>🎉 Nuovo record: {highScore}!</div>
      )}

      {/* Prompt */}
      <div className={styles.prompt}>
        Quale dei due è il più <strong>giovane</strong>?
      </div>

      {/* Arena */}
      <div className={styles.arena}>
        {loading ? (
          <>
            <div className={`${styles.actorCard} ${styles.cardLeft} ${styles.skeleton}`} />
            <div className={styles.vsCenter}><span className={styles.vsText}>VS</span></div>
            <div className={`${styles.actorCard} ${styles.cardRight} ${styles.skeleton}`} />
          </>
        ) : pair ? (
          <>
            {renderCard(pair.actorA, "A")}
            <div className={styles.vsCenter}><span className={styles.vsText}>VS</span></div>
            {renderCard(pair.actorB, "B")}
          </>
        ) : (
          <p className={styles.errorMsg}>Errore nel caricare. Riprova.</p>
        )}
      </div>

      {/* Result bar */}
      {revealed && !gameOver && isCorrect && (
        <div className={styles.resultBar}>
          <div className={styles.resultLeft}>
            <span>✅</span>
            <span className={styles.resultText}>Corretto!</span>
            {streak > 1 && <span className={styles.streakBonus}>🔥 ×{streak}</span>}
          </div>
        </div>
      )}
      {revealed && isCorrect === false && (
        <div className={`${styles.resultBar} ${styles.resultWrong}`}>
          <div className={styles.resultLeft}>
            <span>❌</span>
            <span className={styles.resultText}>Sbagliato!</span>
          </div>
        </div>
      )}

      {/* Game Over */}
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
                  usedIdsRef.current = [];
                  sessionStorage.removeItem("actorAgeSession");
                  fetchPair([]);
                }}
              >
                Riprova
              </button>
              <button
                className={styles.menuBtn}
                onClick={() => navigate("/actor-age-game")}
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className={styles.footer}>
        <p className={styles.poweredBy}>
          Powered by <span className={styles.brand}>Skibidi Film</span>
        </p>
      </footer>
    </div>
  );
}

export default ActorAgeGamePlay;
