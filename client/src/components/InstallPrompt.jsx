import { useState, useEffect } from 'react';
import { MdOutlineGetApp, MdClose, MdIosShare } from 'react-icons/md';
import './InstallPrompt.css';

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  useEffect(() => {
    // Controllo se l'app è già installata (PWA standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (isStandalone) {
      return; 
    }

    // Per Android/Desktop
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroidPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Rilevamento iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    if (isIos() && !isStandalone) {
      // Potremmo usare localStorage per non stressare l'utente ad ogni visita
      const hasSeenIosPrompt = localStorage.getItem('hasSeenIosPrompt');
      if (!hasSeenIosPrompt) {
        setShowIosPrompt(true);
      }
    }

    // Cleanup
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowAndroidPrompt(false);
    }
  };

  const handleCloseAndroid = () => {
    setShowAndroidPrompt(false);
  };

  const handleCloseIos = () => {
    setShowIosPrompt(false);
    localStorage.setItem('hasSeenIosPrompt', 'true');
  };

  if (showAndroidPrompt) {
    return (
      <div className="install-prompt-banner">
        <div className="install-prompt-content">
          <MdOutlineGetApp className="install-icon" />
          <span>Installa <strong>Skibidi Film</strong> per un'esperienza migliore!</span>
        </div>
        <div className="install-prompt-actions">
          <button className="install-btn" onClick={handleInstallClick}>Installa</button>
          <button className="close-btn" onClick={handleCloseAndroid}>
            <MdClose size={20} />
          </button>
        </div>
      </div>
    );
  }

  if (showIosPrompt) {
    return (
      <div className="install-prompt-banner ios-prompt">
        <div className="install-prompt-content">
          <p>
            Installa l'app: tocca l'icona <MdIosShare size={20} style={{ margin: '0 4px', verticalAlign: 'middle' }} /> <strong>Condividi</strong><br/>
            e poi <strong>"Aggiungi alla schermata Home"</strong>
          </p>
        </div>
        <div className="install-prompt-actions">
          <button className="close-btn" onClick={handleCloseIos}>
            <MdClose size={20} />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default InstallPrompt;
