import React from "react";
import { useNavigate } from "react-router-dom";
import styles from "./RatingGamePage.module.css";
import { FaStar, FaDollarSign, FaTrophy } from "react-icons/fa";

function RatingGamePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* Hero Section */}
      <div className={styles.hero}>
        <h1 className={styles.title}>
          The<br />
          <span className={styles.titleHighlight}>Rating</span><br />
          Game
        </h1>
        <p className={styles.subtitle}>
          scegli il più alto. batti il tuo streak.
        </p>
      </div>

      {/* Mode Cards */}
      <div className={styles.modesSection}>
        <h2 className={styles.sectionLabel}>Scegli la modalità</h2>
        <div className={styles.modeCards}>
          {/* Play Rating */}
          <button
            className={`${styles.modeCard} ${styles.ratingCard}`}
            onClick={() => navigate("/rating-game/play?mode=rating")}
          >
            <div className={styles.modeIcon}>
              <FaStar />
            </div>
            <div className={styles.modeInfo}>
              <h3 className={styles.modeName}>Play Rating</h3>
              <p className={styles.modeDesc}>
                Quale film ha il voto più alto su TMDB?
              </p>
            </div>
            <div className={styles.modeArrow}>›</div>
          </button>

          {/* Play Box Office */}
          <button
            className={`${styles.modeCard} ${styles.boxofficeCard}`}
            onClick={() => navigate("/rating-game/play?mode=boxoffice")}
          >
            <div className={styles.modeIcon}>
              <FaDollarSign />
            </div>
            <div className={styles.modeInfo}>
              <h3 className={styles.modeName}>Play Box Office</h3>
              <p className={styles.modeDesc}>
                Quale film ha incassato di più al botteghino?
              </p>
            </div>
            <div className={styles.modeArrow}>›</div>
          </button>
        </div>
      </div>

      {/* How to play */}
      <div className={styles.howTo}>
        <div className={styles.howToCard}>
          <FaTrophy className={styles.howToIcon} />
          <p className={styles.howToText}>
            Scegli tra <strong>2 film</strong> quello con il valore più alto.
            Batti il tuo <strong>streak</strong> e mettiti alla prova!
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <p className={styles.poweredBy}>
          Powered by{" "}
          <span className={styles.brand}>Skibidi Film</span>
        </p>
      </footer>
    </div>
  );
}

export default RatingGamePage;
