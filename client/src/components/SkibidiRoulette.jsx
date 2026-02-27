import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SkibidiRoulette.module.css";
import { FaDice, FaPlay } from "react-icons/fa";

function SkibidiRoulette({ watchlist }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [winner, setWinner] = useState(null);
  const navigate = useNavigate();

  const posterBaseUrl = "https://image.tmdb.org/t/p/w500";
  const placeholderPoster = "https://placehold.co/300x450/1a1a2e/666?text=No+Image";

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  const startSpin = useCallback(() => {
    if (watchlist.length === 0 || isSpinning) return;
    
    setIsSpinning(true);
    setWinner(null);
    let spins = 0;
    const maxSpins = Math.floor(Math.random() * 20) + 30; // Random number of total changes (30-50)
    let speed = 50; // Initial fast speed
    
    const spinAction = () => {
      spins++;
      
      // Update the currently displayed poster
      setCurrentIndex((prev) => (prev + Math.floor(Math.random() * 5) + 1) % watchlist.length);

      if (spins < maxSpins) {
        // Slow down towards the end
        if (spins > maxSpins - 15) {
          speed += 20; // Increase interval time rapidly at the end
        } else if (spins > maxSpins / 2) {
          speed += 5; // Gradually start slowing down halfway
        }
        setTimeout(spinAction, speed);
      } else {
        // Final selection
        const finalWinnerIndex = Math.floor(Math.random() * watchlist.length);
        setCurrentIndex(finalWinnerIndex);
        setWinner(watchlist[finalWinnerIndex]);
        setIsSpinning(false);
      }
    };

    spinAction(); // Start the loop
  }, [watchlist, isSpinning]);

  const handleWatchNow = () => {
    if (winner) {
      setIsOpen(false);
      navigate(`/${winner.media_type === "tv" ? "tv" : "movie"}/${winner.tmdb_id}`);
    }
  };

  const currentMovie = winner || (watchlist.length > 0 ? watchlist[currentIndex] : null);

  if (!watchlist || watchlist.length < 2) return null; // Need at least 2 items to make roulette meaningful

  return (
    <>
      <button 
        className={styles.openRouletteBtn} 
        onClick={() => setIsOpen(true)}
        title="Non sai cosa guardare? Prova la Skibidi Roulette!"
      >
        <FaDice />
      </button>

      {isOpen && (
        <div className={styles.modalOverlay} onClick={() => !isSpinning && setIsOpen(false)}>
          <div className={styles.rouletteContainer} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => !isSpinning && setIsOpen(false)}>
              &times;
            </button>
            <h2 className={styles.title}>Skibidi Roulette</h2>
            
            <div className={styles.slotMachine}>
              {currentMovie ? (
                <div className={`${styles.posterWrapper} ${styles.active} ${winner ? styles.winner : ""}`}>
                  <img 
                    src={currentMovie.poster_path ? `${posterBaseUrl}${currentMovie.poster_path}` : placeholderPoster} 
                    alt={currentMovie.title || currentMovie.name}
                    className={styles.posterImg}
                  />
                  <div className={styles.movieInfo}>
                    <h3 className={styles.movieTitle}>{currentMovie.title || currentMovie.name}</h3>
                  </div>
                </div>
              ) : (
                <div className={`${styles.posterWrapper} ${styles.active}`}>
                   <img src={placeholderPoster} alt="Placeholder" className={styles.posterImg} style={{filter: 'none'}} />
                </div>
              )}
            </div>

            <button 
              className={styles.spinBtn}
              onClick={startSpin}
              disabled={isSpinning}
            >
              {isSpinning ? "Girando..." : winner ? "Gira di nuovo" : "Gira la ruota!"}
            </button>

            {winner && (
              <button className={styles.watchBtn} onClick={handleWatchNow}>
                <FaPlay /> Guarda Ora
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SkibidiRoulette;
