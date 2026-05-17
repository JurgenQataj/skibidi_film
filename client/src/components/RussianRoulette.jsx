import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import styles from "./RussianRoulette.module.css";
import { FaPlay } from "react-icons/fa";
import { GiRevolver } from "react-icons/gi";

// Gun icon for the trigger button
const GunIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <path d="M14 2v6h6"></path>
    <path d="M12 18v-6"></path>
    <path d="M9 15h6"></path>
  </svg>
);

// Better gun icon
const CrosshairIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="22" y1="12" x2="18" y2="12"></line>
    <line x1="6" y1="12" x2="2" y2="12"></line>
    <line x1="12" y1="6" x2="12" y2="2"></line>
    <line x1="12" y1="22" x2="12" y2="18"></line>
  </svg>
);

const POSTER_BASE = "https://image.tmdb.org/t/p/w300";

function RussianRoulette({ watchlist }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Select, 2: Animate, 3: Result
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [winner, setWinner] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const toggleMovie = (movie) => {
    const isSelected = selectedMovies.some(m => m.tmdb_id === movie.tmdb_id);
    if (isSelected) {
      setSelectedMovies(selectedMovies.filter(m => m.tmdb_id !== movie.tmdb_id));
    } else {
      if (selectedMovies.length < 6) {
        setSelectedMovies([...selectedMovies, movie]);
      }
    }
  };

  const handleShoot = () => {
    if (selectedMovies.length < 2) return;
    setStep(2); // Start animation
    
    // Random winner chosen immediately
    const winnerIdx = Math.floor(Math.random() * selectedMovies.length);
    setWinner(selectedMovies[winnerIdx]);

    // Animation timing (spinning is 3s, flash is 0.15s)
    setTimeout(() => {
      setStep(3); // Result
    }, 3100);
  };

  const reset = () => {
    setSelectedMovies([]);
    setWinner(null);
    setStep(1);
    setIsOpen(false);
  };

  if (!watchlist || watchlist.length < 2) return null;

  return createPortal(
    <>
      <button
        className={styles.openRouletteBtn}
        onClick={() => { setIsOpen(true); setStep(1); setSelectedMovies([]); setWinner(null); }}
        title="Roulette Russa"
      >
        <CrosshairIcon />
      </button>

      {isOpen && (
        <div className={`${styles.modalOverlay} ${step === 2 ? styles.shake : ""}`}>
          {step === 1 && <button className={styles.closeBtn} onClick={reset}>&times;</button>}
          
          {/* STEP 1: Selection */}
          {step === 1 && (
            <div className={styles.selectionContainer}>
              <h2 className={styles.title}>Roulette <span>Russa</span></h2>
              <p className={styles.subtitle}>Carica fino a 6 film nel tamburo...</p>
              
              <div className={styles.grid}>
                {watchlist.map((movie) => {
                  const isSelected = selectedMovies.some(m => m.tmdb_id === movie.tmdb_id);
                  return (
                    <div 
                      key={movie.tmdb_id} 
                      className={`${styles.movieItem} ${isSelected ? styles.selected : ""}`}
                      onClick={() => toggleMovie(movie)}
                    >
                      <img 
                        src={movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"} 
                        alt={movie.title || movie.name} 
                      />
                    </div>
                  );
                })}
              </div>

              <div className={styles.cylinderWrap}>
                <div className={styles.cylinder}>
                  <div className={styles.centralPin}></div>
                  {[0, 1, 2, 3, 4, 5].map(i => (
                    <div key={i} className={`${styles.chamber} ${i < selectedMovies.length ? styles.loaded : ""}`}></div>
                  ))}
                </div>
                <button 
                  className={styles.shootBtn} 
                  disabled={selectedMovies.length < 2}
                  onClick={handleShoot}
                >
                  {selectedMovies.length < 2 ? "Seleziona almeno 2 film" : "💥 SPARA!"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 & 3: Animation and Result */}
          {(step === 2 || step === 3) && (
            <div className={styles.animationContainer}>
               {step === 3 && <div className={styles.muzzleFlash}></div>}
               
               <h2 className={styles.title} style={{ marginBottom: '30px' }}>
                 {step === 2 ? "Fato in corso..." : "Il Prescelto"}
               </h2>

               <div className={styles.miniGrid}>
                 {selectedMovies.map(movie => {
                    const isWinner = winner && winner.tmdb_id === movie.tmdb_id;
                    const isLoser = step === 3 && !isWinner;
                    return (
                      <div 
                        key={movie.tmdb_id} 
                        className={`${styles.miniMovieWrap} ${isLoser ? styles.loserDrop : ""} ${step===3 && isWinner ? styles.winnerFocus : ""}`}
                      >
                        <div className={styles.miniMovieItem}>
                          <img 
                            src={movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"} 
                            alt={movie.title || movie.name} 
                          />
                          {step === 3 && isWinner && (
                            <div className={styles.bulletHoleSmall}>
                               <div className={styles.bulletHoleCenter}></div>
                            </div>
                          )}
                        </div>
                        {step === 3 && isWinner && (
                           <button 
                             className={styles.watchBtnSmall} 
                             onClick={() => {
                               reset();
                               navigate(`/${winner.media_type === "tv" ? "tv" : "movie"}/${winner.tmdb_id}`);
                             }}
                           >
                             <FaPlay /> Guarda Ora
                           </button>
                        )}
                      </div>
                    )
                 })}
               </div>
               
               {/* THE FPS GUN (Frontal 3D CSS) */}
               <div className={`${styles.fpsGunFrontal} ${step === 2 ? styles.aimSweepFrontal : styles.firingRecoilFrontal}`}>
                 <div className={styles.gunBarrel3D}>
                   <div className={styles.gunSightFront}></div>
                   <div className={styles.gunSightRear}></div>
                 </div>
                 {step === 3 && <div className={styles.barrelFlashFrontal}></div>}
               </div>

               {step === 3 && (
                 <button className={styles.closeBtn} onClick={reset} style={{ zIndex: 100 }}>&times;</button>
               )}
            </div>
          )}
        </div>
      )}
    </>,
    document.body
  );
}

export default RussianRoulette;
