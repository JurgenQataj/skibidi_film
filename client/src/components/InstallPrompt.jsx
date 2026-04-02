import { useState, useEffect } from 'react';
import { MdOutlineGetApp, MdClose, MdIosShare, MdPhoneAndroid } from 'react-icons/md';
import './InstallPrompt.css';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isStandalone) return;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Piccolo delay per non mostrarlo immediatamente al caricamento
      setTimeout(() => setShowAndroidPrompt(true), 2500);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    if (isIos && !isStandalone) {
      const hasSeenIosPrompt = localStorage.getItem('hasSeenIosPrompt');
      if (!hasSeenIosPrompt) {
        setTimeout(() => setShowIosPrompt(true), 2500);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const dismiss = (callback) => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      callback();
    }, 380);
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      dismiss(() => {
        setDeferredPrompt(null);
        setShowAndroidPrompt(false);
      });
    }
  };

  const handleCloseAndroid = () => {
    dismiss(() => setShowAndroidPrompt(false));
  };

  const handleCloseIos = () => {
    dismiss(() => {
      setShowIosPrompt(false);
      localStorage.setItem('hasSeenIosPrompt', 'true');
    });
  };

  if (!showAndroidPrompt && !showIosPrompt) return null;

  return (
    <>
      {/* Overlay di sfondo */}
      <div
        className={`install-backdrop ${isClosing ? 'install-backdrop--out' : ''}`}
        onClick={showAndroidPrompt ? handleCloseAndroid : handleCloseIos}
      />

      {/* Bottom Sheet */}
      <div className={`install-sheet ${isClosing ? 'install-sheet--out' : ''}`}>
        {/* Handle bar (come le app native) */}
        <div className="install-handle" />

        {/* Header */}
        <div className="install-sheet-header">
          <div className="install-app-icon">
            <img src="/pwa-192x192.png" alt="Skibidi Film" />
          </div>
          <button
            className="install-close"
            onClick={showAndroidPrompt ? handleCloseAndroid : handleCloseIos}
            aria-label="Chiudi"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* Contenuto */}
        {showAndroidPrompt && (
          <div className="install-sheet-body">
            <h2 className="install-title">Portalo sempre con te</h2>
            <p className="install-desc">
              Installa <strong>Skibidi Film</strong> sulla tua schermata Home.
              Nessuno store, accesso istantaneo, esperienza da app nativa.
            </p>
            <div className="install-perks">
              <span>⚡ Avvio fulmineo</span>
              <span>📴 Funziona offline</span>
              <span>🔔 Notifiche live</span>
            </div>
            <button className="install-cta" onClick={handleInstallClick}>
              <MdPhoneAndroid size={20} />
              Installa l'app — è gratis
            </button>
            <button className="install-skip" onClick={handleCloseAndroid}>
              No grazie
            </button>
          </div>
        )}

        {showIosPrompt && (
          <div className="install-sheet-body">
            <h2 className="install-title">Aggiungi alla Home</h2>
            <p className="install-desc">
              Per installare <strong>Skibidi Film</strong> su iOS, segui questi passi:
            </p>
            <ol className="install-ios-steps">
              <li>
                Tocca <MdIosShare size={18} style={{ verticalAlign: 'middle', margin: '0 3px' }} />
                <strong>Condividi</strong> nella barra di Safari
              </li>
              <li>Scorri e seleziona <strong>"Aggiungi alla schermata Home"</strong></li>
              <li>Premi <strong>Aggiungi</strong> in alto a destra</li>
            </ol>
            <button className="install-cta install-cta--secondary" onClick={handleCloseIos}>
              Ho capito!
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default InstallPrompt;

