import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import styles from "./GuessYearGamePlay.module.css";
import { FaArrowLeft } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "";

function GuessYearGamePlay() {
  const navigate = useNavigate();
  const [session, setSession] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [usedIds, setUsedIds] = useState([]);
  
  // Stati UI Gameplay
  const [inputValue, setInputValue] = useState("");
  const [overlayState, setOverlayState] = useState({
    visible: false,
    text: "",
    pointsEarned: 0,
    realYear: 0,
    className: ""
  });
  
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [isHighScore, setIsHighScore] = useState(false);
  
  const inputRef = useRef(null);

  // Focus automatico disabilitato per non forzare lo scroll in basso su mobile


  const fetchSession = async (idsToExclude = usedIds) => {
    setLoading(true);
    setGameOver(false);
    setOverlayState({ visible: false });
    setTotalScore(0);
    setCurrentIndex(0);
    setInputValue("");
    sessionStorage.removeItem("guessYearSession");

    try {
      const res = await axios.get(`${API_URL}/api/guess-year/session`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        params: { exclude: idsToExclude.slice(-100).join(",") }
      });
      setSession(res.data);
      
      // Salva sessione in storage per refresh
      sessionStorage.setItem("guessYearSession", JSON.stringify({
        movies: res.data,
        currentIndex: 0,
        totalScore: 0,
        usedIds: idsToExclude
      }));
    } catch (err) {
      console.error("Errore avvio partita guess-year:", err);
      alert("Errore caricamento partita. Riprova.");
      navigate("/guess-year");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Al mount cerchiamo di recuperare sessione salvata, altrimenti nuova
    const saved = sessionStorage.getItem("guessYearSession");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.movies && parsed.movies.length > 0) {
          setSession(parsed.movies);
          setCurrentIndex(parsed.currentIndex);
          setTotalScore(parsed.totalScore);
          setUsedIds(parsed.usedIds || []);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }
    fetchSession([]);
    // eslint-disable-next-line
  }, []);

  const handlePlayAgain = () => {
    // Al reinizio partita, aggiunge i film correnti alla lista di ID esclusi
    const idsFromCurrentGame = session.map(movie => movie.tmdb_id);
    const newUsedIds = [...usedIds, ...idsFromCurrentGame];
    setUsedIds(newUsedIds);
    fetchSession(newUsedIds);
  };

  const handleEndGame = async (finalScore) => {
    setGameOver(true);
    sessionStorage.removeItem("guessYearSession");
    
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const res = await axios.post(
          `${API_URL}/api/guess-year/score`,
          { score: finalScore },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.newHighScore) {
          setIsHighScore(true);
        }
      } catch (err) {
        console.error("Errore salvataggio punteggio:", err);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue || inputValue.length < 3) return;

    const guessedYear = parseInt(inputValue, 10);
    const movie = session[currentIndex];
    const realYear = movie.releaseYear;

    const diff = Math.abs(realYear - guessedYear);
    
    // Nuova logica punti:
    // Esatto (+10),  <=3 (+7),  <=5 (+3), <=10 (+1)
    let earned = 0;
    let feedbackText = "";
    let feedbackClass = "";

    if (diff === 0) {
      earned = 10;
      feedbackText = "Esatto!";
      feedbackClass = styles.pointsCorrect;
    } else if (diff <= 3) {
      earned = 7;
      feedbackText = "Fuoco!";
      feedbackClass = styles.pointsClose;
    } else if (diff <= 5) {
      earned = 3;
      feedbackText = "Fuochino!";
      feedbackClass = styles.pointsClose; // Riutilizziamo lo stile giallo per i "Close"
    } else if (diff <= 10) {
      earned = 1;
      feedbackText = "Lontano";
      feedbackClass = styles.pointsMissed;
    } else {
      earned = 0;
      feedbackText = "Fuori Strada!";
      feedbackClass = styles.pointsMissed;
    }
    
    const newTotal = totalScore + earned;
    setTotalScore(newTotal);

    setOverlayState({
      visible: true,
      text: feedbackText,
      pointsEarned: earned,
      realYear: realYear,
      className: feedbackClass
    });

    // Salva step intermedi
    sessionStorage.setItem("guessYearSession", JSON.stringify({
      movies: session,
      currentIndex: currentIndex + 1,
      totalScore: newTotal,
      usedIds: usedIds
    }));

    // Aspetta 2 secondi sull'overlay e poi avanza
    setTimeout(() => {
      setOverlayState(prev => ({ ...prev, visible: false }));
      setInputValue("");
      
      if (currentIndex + 1 >= session.length) {
        handleEndGame(newTotal);
      } else {
        setCurrentIndex(curr => curr + 1);
      }
    }, 2500);
  };

  if (loading || session.length === 0) {
    return (
      <div className={styles.page}>
         <div className={styles.loadingText}>Caricamento Pellicole...</div>
      </div>
    );
  }

  // --- RENDERING ---
  const currentMovie = session[currentIndex];

  if (gameOver) {
    return (
      <div className={styles.page}>
        <div className={styles.endScreen}>
          <h1 className={styles.gameOverTitle}>Partita Terminata!</h1>
          
          <div className={styles.finalScoreBox}>
             <p className={styles.finalScoreTitle}>Punteggio Finale</p>
             <p className={styles.finalScoreValue}>{totalScore} <span className={styles.finalScoreMax}>/ {session.length * 10}</span></p>
             {isHighScore && (
               <div className={styles.recordNotice}>Nuovo Record Personale! 🏆</div>
             )}
          </div>
          
          <button className={styles.playAgainBtn} onClick={handlePlayAgain}>
             Gioca Ancora
          </button>
          
          <button 
            style={{marginTop: '20px', background: 'transparent', border: '1px solid white', color: 'white', padding: '12px 24px', borderRadius: '24px', cursor: 'pointer'}} 
            onClick={() => { sessionStorage.removeItem("guessYearSession"); navigate("/guess-year", { replace: true }); }}
          >
             Torna alla Menu
          </button>
        </div>
      </div>
    );
  }

  // Backdrop per l'atmosfera (se disponibile, altrimenti poster)
  const bgImage = currentMovie?.backdrop_path 
     ? `https://image.tmdb.org/t/p/w1280${currentMovie.backdrop_path}` 
     : currentMovie?.poster_path ? `https://image.tmdb.org/t/p/w1280${currentMovie.poster_path}` : "";

  return (
    <div className={styles.page}>
      {/* Sfondo in blur per atmosfera */}
      <div 
        className={styles.background} 
        style={{ backgroundImage: `url(${bgImage})` }} 
      />

      <div className={styles.topBar}>
        <button className={styles.backBtn} onClick={() => { sessionStorage.removeItem("guessYearSession"); navigate("/guess-year", { replace: true }); }}>
          <FaArrowLeft />
        </button>
        <span className={styles.modeTag}>📅 Quale Anno?</span>
        <div className={styles.scoreInfo}>
           <span className={styles.bestBadge}>⭐ {totalScore}</span>
           <span className={styles.streakBadge}>{currentIndex + 1} / {session.length}</span>
        </div>
      </div>

      <div className={styles.prompt}>
        <strong>In che anno è uscito questo film?</strong> — {currentMovie.title}
      </div>

      <div className={styles.arena}>
         <div className={styles.imageContainer}>
            <img 
              src={`https://image.tmdb.org/t/p/w500${currentMovie.poster_path}`} 
              alt="Poster Film" 
              className={styles.moviePoster}
            />
         </div>
            
         <form onSubmit={handleSubmit} className={styles.inputForm}>
            <input 
               type="number" 
               id="yearInput"
               ref={inputRef}
               className={styles.guessInput}
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               placeholder="YYYY"
               min="1900"
               max={new Date().getFullYear()}
               required
               autoComplete="off"
            />
            
            <button 
               type="submit" 
               className={styles.submitBtn}
               disabled={!inputValue || inputValue.length < 4}
            >
               Indovina
            </button>
         </form>
      </div>

      {/* OVERLAY DI TRANSIZIONE TURNO */}
      {overlayState.visible && (
        <div className={styles.overlay}>
           <div className={`${styles.overlayResultText} ${overlayState.className}`}>
             {overlayState.text}
           </div>
           
           <div className={styles.overlayDataBox}>
             <p className={styles.overlayRealYearLabel}>Anno Reale</p>
             <div className={styles.overlayRealYear}>{overlayState.realYear}</div>
             <div className={styles.overlayPoints}>
               + <span className={overlayState.className}>{overlayState.pointsEarned}</span> pt
             </div>
           </div>
        </div>
      )}

    </div>
  );
}

export default GuessYearGamePlay;
