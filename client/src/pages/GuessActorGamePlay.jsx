import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./GuessActorGamePlay.module.css";
import { FaArrowLeft, FaCheck, FaTimes } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

// Punti per tentativo: 1° = 3 pt, 2° = 2 pt, 3° = 1 pt
const POINTS_BY_ATTEMPT = [3, 2, 1];

const BLUR_STAGES = [16, 10, 5];
// Initialize blurAmount with BLUR_STAGES[0]

const SESSION_KEY = "guessActorSession";
const STATE_KEY = "guessActorState";

function GuessActorGamePlay() {
  const navigate = useNavigate();
  const [actors, setActors] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Game state
  const [blurAmount, setBlurAmount] = useState(BLUR_STAGES[0]);
  const [attempts, setAttempts] = useState(3); // 3 = primo tentativo disponibile
  const [score, setScore] = useState(0);
  const [guess, setGuess] = useState("");
  const [status, setStatus] = useState("playing"); // playing, correct, wrong, gameover
  const [newRecord, setNewRecord] = useState(false);
  const [wrongShake, setWrongShake] = useState(false);
  const [lastPoints, setLastPoints] = useState(0);

  const scoreRef = useRef(0);

  // --- Persistenza sessione su sessionStorage ---
  // Salva currentIndex e score quando cambiano (solo se in gioco)
  useEffect(() => {
    if (actors.length === 0) return;
    sessionStorage.setItem(
      STATE_KEY,
      JSON.stringify({ currentIndex, score: scoreRef.current })
    );
  }, [currentIndex, score, actors.length]);

  const fetchSession = useCallback(async (forceNew = false) => {
    setLoading(true);
    setStatus("playing");
    setBlurAmount(BLUR_STAGES[0]);
    setAttempts(3);
    setGuess("");
    setNewRecord(false);
    setImgLoaded(false);
    setLastPoints(0);

    // Se non forziamo una sessione nuova, proviamo a recuperare quella salvata
    if (!forceNew) {
      const saved = sessionStorage.getItem(SESSION_KEY);
      const savedState = sessionStorage.getItem(STATE_KEY);
      if (saved) {
        try {
          const parsedActors = JSON.parse(saved);
          const parsedState = savedState ? JSON.parse(savedState) : null;
          setActors(parsedActors);
          if (parsedState) {
            const idx = parsedState.currentIndex ?? 0;
            const sc = parsedState.score ?? 0;
            setCurrentIndex(idx);
            setScore(sc);
            scoreRef.current = sc;
          } else {
            setCurrentIndex(0);
            setScore(0);
            scoreRef.current = 0;
          }
          setLoading(false);
          return;
        } catch {
          // sessione corrotta → ne creiamo una nuova
        }
      }
    }

    // Nessuna sessione salvata o forziamo nuova → fetch dal server
    setCurrentIndex(0);
    setScore(0);
    scoreRef.current = 0;

    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/guess-actor/session`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActors(res.data);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(res.data));
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ currentIndex: 0, score: 0 }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    setImgLoaded(false);
  }, [currentIndex]);


  const submitScore = async (finalScore) => {
    const token = localStorage.getItem("token");
    if (!token || finalScore === 0) return;
    try {
      const res = await axios.post(
        `${API_URL}/api/guess-actor/score`,
        { score: finalScore },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && res.data.score === finalScore && finalScore > 0) {
        setNewRecord(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const advanceToNext = (currentScore) => {
    if (currentIndex < actors.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setBlurAmount(BLUR_STAGES[0]);
      setAttempts(3);
      setGuess("");
      setLastPoints(0);
      setStatus("playing");
    } else {
      // Partita finita: pulire sessionStorage
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(STATE_KEY);
      setStatus("gameover");
      submitScore(currentScore);
    }
  };

  const handleGuess = (e) => {
    e.preventDefault();
    if (status !== "playing" || !guess.trim()) return;

    const currentActor = actors[currentIndex];

    const normalize = (str) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const normalizedGuess = normalize(guess);
    const normalizedTarget = normalize(currentActor.lastName);
    const normalizedFullName = normalize(currentActor.name);

    const isCorrect =
      normalizedGuess === normalizedTarget ||
      normalizedGuess === normalizedFullName;

    if (isCorrect) {

      // Punti basati sul tentativo corrente (3→2→1)
      const attemptIndex = 3 - attempts; // 0=primo, 1=secondo, 2=terzo
      const points = POINTS_BY_ATTEMPT[attemptIndex] ?? 1;

      setLastPoints(points);
      setStatus("correct");

      const newScore = scoreRef.current + points;
      setScore(newScore);
      scoreRef.current = newScore;

      setTimeout(() => advanceToNext(newScore), 2500);
    } else {
      setWrongShake(true);
      setTimeout(() => setWrongShake(false), 500);

      if (attempts > 1) {
        const nextAttempt = attempts - 1;
        setBlurAmount(BLUR_STAGES[3 - nextAttempt]);
        setAttempts(nextAttempt);
        setGuess("");
      } else {
        // Esauriti i tentativi
        setStatus("wrong");
        setTimeout(() => advanceToNext(scoreRef.current), 2500);
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(STATE_KEY); navigate("/guess-actor", { replace: true }); }}><FaArrowLeft /></button>
          <span className={styles.modeTag}>🎭 Chi è?</span>
          <span />
        </div>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner} />
          <p>Preparazione attori...</p>
        </div>
      </div>
    );
  }

  if (actors.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.topBar}>
          <button className={styles.backBtn} onClick={() => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(STATE_KEY); navigate("/guess-actor", { replace: true }); }}><FaArrowLeft /></button>
        </div>
        <div className={styles.errorMsg}>Errore nel caricare la partita. Riprova.</div>
      </div>
    );
  }

  const currentActor = actors[currentIndex];
  const attemptIndex = 3 - attempts; // 0=primo, 1=secondo, 2=terzo
  const potentialPoints = POINTS_BY_ATTEMPT[attemptIndex] ?? 1;

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(STATE_KEY); navigate("/guess-actor", { replace: true }); }}>
          <FaArrowLeft />
        </button>
        <span className={styles.modeTag}>🎭 Chi è?</span>
        <div className={styles.scoreInfo}>
          <span className={styles.bestBadge}>⭐ {score}</span>
          <span className={styles.streakBadge}>{currentIndex + 1} / {actors.length}</span>
        </div>
      </div>

      {/* Prompt */}
      {status === "playing" && (
        <div className={styles.prompt}>
          <strong>Chi è questo attore?</strong> — rispondi con il cognome
          <span className={styles.pointsHint}> · +{potentialPoints} pt disponibili</span>
        </div>
      )}

      {/* Arena */}
      <div className={styles.arena}>
        {/* Immagine con blur */}
        <div className={`${styles.imageContainer} ${wrongShake ? styles.shake : ""}`}>
          <img
            key={`actor-${currentIndex}`}
            src={`${TMDB_IMAGE}${currentActor.profile_path}`}
            alt="Indovina questo attore"
            className={styles.actorImage}
            style={{
              filter: `blur(${status === "playing" ? blurAmount : 0}px)`,
              transition: imgLoaded ? (status === "playing" ? "filter 3s ease-out" : "filter 0.5s ease-out") : "none",
            }}
            onLoad={() => setImgLoaded(true)}
          />

          {/* Pallini tentativi */}
          {status === "playing" && (
            <div className={styles.attemptsOverlay}>
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`${styles.attemptDot} ${i <= attempts ? styles.attemptDotActive : styles.attemptDotGone}`}
                />
              ))}
            </div>
          )}

          {/* Overlay risultato — la foto nitida è visibile sotto per 2s */}
          {status === "correct" && (
            <div className={`${styles.overlay} ${styles.overlayCorrect}`}>
              <FaCheck className={styles.overlayIcon} />
              <span className={styles.overlayPoints}>+{lastPoints}</span>
              <span className={styles.revealedName}>{currentActor.name}</span>
            </div>
          )}
          {status === "wrong" && (
            <div className={`${styles.overlay} ${styles.overlayWrong}`}>
              <FaTimes className={styles.overlayIcon} />
              <span className={styles.overlayText}>Peccato!</span>
              <span className={styles.revealedName}>{currentActor.name}</span>
            </div>
          )}
        </div>

        {/* Input */}
        {status === "playing" && (
          <form onSubmit={handleGuess} className={styles.inputForm}>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Scrivi il cognome..."
              className={styles.guessInput}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
            />
            <button type="submit" className={styles.submitBtn}>Indovina</button>
          </form>
        )}
      </div>

      {/* Game Over */}
      {status === "gameover" && (
        <div className={styles.gameOverOverlay}>
          <div className={styles.gameOverCard}>
            <p className={styles.gameOverEmoji}>🎭</p>
            <p className={styles.gameOverTitle}>Partita Finita</p>
            <p className={styles.gameOverSubtitle}>Punteggio Finale</p>
            <p className={styles.gameOverScore}>{score}</p>
            <p className={styles.gameOverMax}>/ {actors.length * 3} massimo</p>
            {newRecord && <p className={styles.gameOverRecord}>🎉 Nuovo record!</p>}
            <div className={styles.gameOverBtns}>
              <button
                className={styles.playAgainBtn}
                onClick={() => fetchSession(true)}
              >
                Gioca Ancora
              </button>
              <button className={styles.menuBtn} onClick={() => { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(STATE_KEY); navigate("/guess-actor", { replace: true }); }}>Menu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuessActorGamePlay;
