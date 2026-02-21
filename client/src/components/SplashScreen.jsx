import { useEffect, useState } from 'react';
import './SplashScreen.css';

function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter'); // enter -> hold -> exit

  useEffect(() => {
    // Fase 1: animazione entrata (0.8s)
    // Fase 2: pausa (0.6s)
    // Fase 3: uscita (0.5s)
    const holdTimer = setTimeout(() => setPhase('hold'), 800);
    const exitTimer = setTimeout(() => setPhase('exit'), 1400);
    const doneTimer = setTimeout(() => onFinish(), 1900);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div className={`splash-screen splash-${phase}`}>
      <div className="splash-content">
        <img
          src="/pwa-192x192.png"
          alt="Skibidi Film"
          className="splash-logo"
        />
        <h1 className="splash-title">Skibidi Film</h1>
        <p className="splash-sub">🎬</p>
      </div>
    </div>
  );
}

export default SplashScreen;
