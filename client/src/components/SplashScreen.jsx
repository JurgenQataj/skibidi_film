import { useEffect, useState } from 'react';
import './SplashScreen.css';

function SplashScreen({ onFinish }) {
  const [phase, setPhase] = useState('enter'); // enter -> hold -> exit

  useEffect(() => {
    // Fase 1: logo sale e compare (800ms)
    // Fase 2: breathing + loading bar (2000ms)  
    // Fase 3: uscita con opacity + translateY(-20px) (600ms)
    const holdTimer  = setTimeout(() => setPhase('hold'), 800);
    const exitTimer  = setTimeout(() => setPhase('exit'), 2700);
    const doneTimer  = setTimeout(() => onFinish(), 3350);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  return (
    <div className={`splash-screen splash-${phase}`}>
      {/* Doppio glow radiale animato */}
      <div className="splash-bg-glow" />

      <div className="splash-content">
        {/* Rings orbitali */}
        <div className="splash-ring">
          <img
            src="/pwa-192x192.png"
            alt="Skibidi Film"
            className="splash-logo"
          />
        </div>

        <h1 className="splash-title">Skibidi Film</h1>
        <p className="splash-tagline">Ogni film, una storia.</p>

        <div className="splash-bar-wrap">
          <div className="splash-bar" />
        </div>
      </div>
    </div>
  );
}

export default SplashScreen;
