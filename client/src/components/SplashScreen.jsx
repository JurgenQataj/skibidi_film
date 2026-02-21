import { useEffect, useState } from 'react';
import './SplashScreen.css';

function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter'); // enter -> hold -> exit

  useEffect(() => {
    // Fase 1: animazione entrata (1s)
    // Fase 2: pausa con glow + barra (1.5s)
    // Fase 3: uscita (0.6s)
    const holdTimer = setTimeout(() => setPhase('hold'), 900);
    const exitTimer = setTimeout(() => setPhase('exit'), 2600);
    const doneTimer = setTimeout(() => onFinish(), 3200);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div className={`splash-screen splash-${phase}`}>
      {/* Glow radiale di sfondo */}
      <div className="splash-bg-glow" />

      <div className="splash-content">
        {/* Logo con rings animati */}
        <div className="splash-ring">
          <img
            src="/pwa-192x192.png"
            alt="Skibidi Film"
            className="splash-logo"
          />
        </div>

        <h1 className="splash-title">Skibidi Film</h1>

        {/* Barra di caricamento */}
        <div className="splash-bar-wrap">
          <div className="splash-bar" />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
