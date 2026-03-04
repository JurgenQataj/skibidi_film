import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./SkibidiRoulette.module.css";
import { FaDice, FaPlay } from "react-icons/fa";

const POSTER_BASE = "https://image.tmdb.org/t/p/w300";
const SLOT_COUNT = 36; // A full roulette wheel

// Helper to pick random items
function shuffleAndPick(arr, n) {
  const copy = [...arr].sort(() => Math.random() - 0.5);
  const result = [];
  for (let i = 0; i < n; i++) result.push(copy[i % copy.length]);
  return result;
}

// Setup bezier easing function
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Function to normalize angle to [0, 2PI)
function normalizeAngle(a) {
  let n = a % (Math.PI * 2);
  if (n < 0) n += Math.PI * 2;
  return n;
}

function SkibidiRoulette({ watchlist }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [slots, setSlots] = useState([]);
  
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const imagesRef = useRef({});
  const navigate = useNavigate();

  // Physics state Refs (to avoid re-renders during 60fps spin)
  const pxRef = useRef({
    wheelAngle: 0,
    wheelVelocity: 0,
    ballAngle: 0,
    ballVelocity: 0,
    ballRadius: 0, // dynamic
    ballPhase: "orbit", // orbit, descend, bounce, rest
    bounceCount: 0,
    lastTime: 0
  });

  // Block page scroll when modal open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Prepare slots whenever watchlist changes or modal opens
  useEffect(() => {
    if (!isOpen) return;
    const picked = shuffleAndPick(watchlist, SLOT_COUNT);
    setSlots(picked);
    pxRef.current.activeSlots = picked;
    setWinner(null);
  }, [isOpen, watchlist]);

  // Pre-load poster images for drawing on canvas
  useEffect(() => {
    // Carica sia gli slot dello stato iniziale che quelli attuali
    (pxRef.current.activeSlots || slots).forEach((movie) => {
      const key = movie.id || movie.tmdb_id;
      if (key && !imagesRef.current[key]) {
        const img = new Image();
        img.src = movie.poster_path ? `${POSTER_BASE}${movie.poster_path}` : "";
        imagesRef.current[key] = img;
      }
    });
  }, [slots]);

  // ─── Drawing Engine ───────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || slots.length === 0) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    
    // Geometry
    const rimR = cx - 4; // Outer metallic rim
    const trackR = rimR * 0.88; // Where the ball orbits
    const wheelOuterR = rimR * 0.78; // Outer edge of the spinning slots
    const wheelInnerR = wheelOuterR * 0.25; // Inner gold hub
    
    const p = pxRef.current;
    const total = SLOT_COUNT;
    const sliceAngle = (Math.PI * 2) / total;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw static background components (Bowl & Track)
    ctx.beginPath();
    ctx.arc(cx, cy, rimR, 0, Math.PI * 2);
    // Deep wooden/casino rim gradient
    const bowlGrad = ctx.createRadialGradient(cx, cy, wheelOuterR, cx, cy, rimR);
    bowlGrad.addColorStop(0, "#0a0a0f");
    bowlGrad.addColorStop(0.5, "#2a1518");
    bowlGrad.addColorStop(1, "#3d1b1f");
    ctx.fillStyle = bowlGrad;
    ctx.fill();
    ctx.strokeStyle = "#FFD700"; // Gold rim
    ctx.lineWidth = 4;
    ctx.stroke();

    // The sloping track the ball rolls on
    ctx.beginPath();
    ctx.arc(cx, cy, trackR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.lineWidth = 12;
    ctx.stroke();

    // 2. Draw the spinning wheel (Slots)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.wheelAngle);

    for (let i = 0; i < total; i++) {
        const startA = i * sliceAngle - Math.PI / 2;
        const endA = startA + sliceAngle;

        // Draw poster completely filling the pie slice
        // Usiamo activeSlots per far coincidere logica e visiva nel frame
        const currentSlots = p.activeSlots || slots;
        const movie = currentSlots[i];
        
        let imgKey;
        if (movie) imgKey = movie.id || movie.tmdb_id;
        const img = imagesRef.current[imgKey];
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, wheelOuterR, startA, endA);
        ctx.closePath();

        if (img && img.complete && img.naturalWidth > 0) {
            ctx.save();
            ctx.clip(); // Restrict drawing to just this pie slice
            
            // Image mapping coordinates
            // We want the poster to stretch across the wide outer part of the slice
            // but centered.
            const midA = (startA + endA) / 2;
            ctx.rotate(midA + Math.PI / 2); // Rotate so slice is pointing UP

            // Draw image. A poster is tall. We draw it so the bottom is at the center 
            // and the top is at the wheel edge.
            const pWidth = wheelOuterR * 2 * Math.sin(sliceAngle/2) * 1.5; 
            const pHeight = wheelOuterR;
            
            // Tweak position so it looks right
            ctx.drawImage(img, -pWidth / 2, -pHeight, pWidth, pHeight);
            
            // Add a subtle radial overlay to dim the center and make edges pop
            const fadeGrad = ctx.createLinearGradient(0, -pHeight, 0, 0);
            fadeGrad.addColorStop(0, "transparent");
            fadeGrad.addColorStop(0.6, "rgba(0,0,0,0.5)");
            fadeGrad.addColorStop(1, "#000");
            ctx.fillStyle = fadeGrad;
            ctx.fillRect(-pWidth / 2, -pHeight, pWidth, pHeight);
            
            ctx.restore();
        } else {
            // Fallback color if image not loaded
            ctx.fillStyle = (i % 2 === 0) ? "#111" : "#e50914"; 
            ctx.fill();
        }

        // Draw metallic divider lines between slots (the "frets")
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(startA) * wheelOuterR, Math.sin(startA) * wheelOuterR);
        ctx.strokeStyle = "rgba(255, 215, 0, 0.5)"; // Gold frets
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Draw standard slot numbers near the inner hub for a tiny casino touch
        const midA = (startA + endA) / 2;
        ctx.save();
        ctx.rotate(midA + Math.PI / 2);
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(7, size * 0.018)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // Place number at ~30% radius
        ctx.fillText(i.toString(), 0, -wheelInnerR * 1.15);
        ctx.restore();
    }

    // Inner gold/silver hub
    ctx.beginPath();
    ctx.arc(0, 0, wheelInnerR, 0, Math.PI * 2);
    const hubGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, wheelInnerR);
    hubGrad.addColorStop(0, "#e8e8e8");
    hubGrad.addColorStop(0.7, "#888");
    hubGrad.addColorStop(1, "#333");
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Tiny center knob
    ctx.beginPath();
    ctx.arc(0, 0, wheelInnerR * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.fill();

    ctx.restore(); // Restore to normal canvas space for the ball

    // 3. Draw the Ball
    const bx = cx + Math.cos(p.ballAngle) * p.ballRadius;
    const by = cy + Math.sin(p.ballAngle) * p.ballRadius;
    const baseBallR = Math.max(6, size * 0.018);
    // Make ball slightly larger when orbiting, smaller when deep in the wheel
    const scale = Math.max(0.7, p.ballRadius / trackR);
    const actualBallR = baseBallR * scale;

    ctx.beginPath();
    ctx.arc(bx, by, actualBallR, 0, Math.PI * 2);
    const ballGrad = ctx.createRadialGradient(
      bx - actualBallR * 0.3, by - actualBallR * 0.3, 0, 
      bx, by, actualBallR
    );
    ballGrad.addColorStop(0, "#fff");
    ballGrad.addColorStop(0.6, "#eee");
    ballGrad.addColorStop(1, "#999");
    ctx.fillStyle = ballGrad;
    ctx.fill();
    
    // Ball drop shadow for depth
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.stroke();
    ctx.shadowColor = "transparent";

  }, [slots]);



  // ─── Deterministic Animation Engine ─────────────────────────────
  // Invece della fisica pura che va fuori sincrono, precalcoliamo l'animazione esatta
  const spinLogic = useCallback((now) => {
    const p = pxRef.current;
    if (p.startTime === 0) p.startTime = now;
    const elapsed = now - p.startTime;
    const t = Math.min(elapsed / p.duration, 1);
    const easeT = easeOutCubic(t);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const cx = canvas.width / 2;
    const trackR = (cx - 4) * 0.88;
    const pocketR = (cx - 4) * 0.78 * 0.85;

    // Wheel angle (spins clockwise)
    p.wheelAngle = normalizeAngle(p.startWheelAngle + p.totalWheelRot * easeT);

    // Ball angle (shoots counter-clockwise)
    p.ballAngle = normalizeAngle(p.startBallAngle - p.totalBallRot * easeT);

    // Ball radius logic
    if (t < 0.75) {
      p.ballRadius = trackR;
    } else {
      const dropProgress = (t - 0.75) / 0.25;
      const easeDrop = easeOutCubic(dropProgress);
      const bounce = Math.sin(dropProgress * Math.PI * 4) * (1 - dropProgress) * 10;
      p.ballRadius = trackR - (trackR - pocketR) * easeDrop + Math.max(0, bounce);
    }

    draw();

    if (t < 1) {
      rafRef.current = requestAnimationFrame(spinLogic);
    } else {
      setWinner(p.finalWinnerMovie);
      setIsSpinning(false);
    }
  }, [draw]);

  const triggerSpin = useCallback(() => {
    if (watchlist.length === 0 || isSpinning) return;
    setIsSpinning(true);
    setWinner(null);

    // Scegli nuovi 36 slot (rimescolati ad ogni giro, anche se in 36 ci sono cloni)
    const freshSlots = shuffleAndPick(watchlist, SLOT_COUNT);
    setSlots(freshSlots);

    // 1. Scegliamo un vincitore matematicamente PRIMA dell'animazione
    const winnerIdx = Math.floor(Math.random() * SLOT_COUNT);
    const winningMovie = freshSlots[winnerIdx];
    
    // 2. Calcoliamo di quanto ruoteranno gli oggetti visivi
    const extraWheelSpins = 4 * Math.PI * 2;
    const extraBallSpins = 10 * Math.PI * 2;
    const sliceAngle = (Math.PI * 2) / SLOT_COUNT;
    
    // 3. Posizioniamo la pallina in un punto randomico sul tabellone finale
    const finalBallAngle = Math.random() * Math.PI * 2;
    const randOffsetInSlice = (Math.random() * 0.7 + 0.15) * sliceAngle; 
    const currentWheelA = pxRef.current.wheelAngle || 0;
    
    // 4. Calcoliamo la direzione in cui dovrà *fermarsi* la ruota 
    // affinche la pallina corrisponda esattamente allo spicchio del winnerIdx.
    const targetWheelAngle = finalBallAngle + Math.PI/2 - (winnerIdx * sliceAngle) - randOffsetInSlice;

    pxRef.current = {
      ...pxRef.current,
      activeSlots: freshSlots,
      startTime: 0,
      duration: 6000 + Math.random() * 1000, 
      startWheelAngle: currentWheelA,
      totalWheelRot: extraWheelSpins + (normalizeAngle(targetWheelAngle) - normalizeAngle(currentWheelA)),
      startBallAngle: pxRef.current.ballAngle || 0,
      totalBallRot: extraBallSpins + (normalizeAngle(pxRef.current.ballAngle || 0) - normalizeAngle(finalBallAngle)),
      wheelAngle: currentWheelA,
      ballAngle: pxRef.current.ballAngle || 0,
      ballRadius: (canvasRef.current?.width / 2 - 4) * 0.88,
      finalWinnerMovie: winningMovie,
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(spinLogic);
  }, [watchlist, isSpinning, spinLogic]);

  // Cleanup & Initial Draw
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    if (slots.length === 0) return;
    // Initial draw
    setTimeout(() => {
      pxRef.current.ballRadius = (canvasRef.current?.width / 2 - 4) * 0.88;
      draw();
    }, 100);
  }, [slots, draw]);

  const handleWatchNow = () => {
    if (!winner) return;
    setIsOpen(false);
    navigate(`/${winner.media_type === "tv" ? "tv" : "movie"}/${winner.tmdb_id}`);
  };

  if (!watchlist || watchlist.length < 2) return null;

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

            <h2 className={styles.title}>🎰 Skibidi Roulette</h2>

            {/* Pointer triangle at top */}
            <div className={styles.pointerWrap}>
              <div className={styles.pointer} />
              <canvas
                ref={canvasRef}
                className={styles.canvas}
                width={500}
                height={500}
              />
            </div>

            <button
              className={styles.spinBtn}
              onClick={triggerSpin}
              disabled={isSpinning}
            >
              {isSpinning ? "🎰 Attendere..." : winner ? "🔄 Tenta ancora" : "🎲 Gioca la Sorte!"}
            </button>

            {winner && !isSpinning && (
              <div className={styles.winnerCard}>
                <img
                  className={styles.winnerPoster}
                  src={winner.poster_path ? `https://image.tmdb.org/t/p/w300${winner.poster_path}` : "https://placehold.co/300x450/1a1a2e/666?text=No+Image"}
                  alt={winner.title || winner.name}
                />
                <div className={styles.winnerInfo}>
                  <p className={styles.winnerLabel}>🏆 Esito del Destino</p>
                  <h3 className={styles.winnerTitle}>{winner.title || winner.name}</h3>
                  <button className={styles.watchBtn} onClick={handleWatchNow}>
                    <FaPlay /> Guarda Ora
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default SkibidiRoulette;
