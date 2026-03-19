import { useState, useEffect } from 'react';
import { MdNotificationsActive, MdClose } from 'react-icons/md';
import { subscribeUserToPush } from '../utils/pushNotifications';
import './InstallPrompt.css'; // Possiamo riutilizzare gli stili del prompt di installazione

function EnableNotificationsPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        return; // Non supportato
      }

      // Se ha già accettato o rifiutato (o se l'abbiamo chiuso noi) non mostriamo il banner
      if (Notification.permission !== 'default') {
        return;
      }
      
      const hasDismissed = localStorage.getItem('dismissedNotificationPrompt');
      if (hasDismissed) {
        return;
      }

      setShowPrompt(true);
    };

    // Diamogli 10 secondi dall'apertura per non sovrapporsi con SplashScreen o InstallPrompt
    const timer = setTimeout(() => {
      checkNotificationStatus();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = localStorage.getItem('token');
        if (token) {
          await subscribeUserToPush(token);
        }
      }
    } catch (error) {
      console.error("Errore durante l'abilitazione delle notifiche:", error);
    } finally {
      setIsSubscribing(false);
      setShowPrompt(false);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    localStorage.setItem('dismissedNotificationPrompt', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="install-prompt-banner" style={{ bottom: '150px' }}>
      <div className="install-prompt-content">
        <MdNotificationsActive className="install-icon" />
        <span>Rimani aggiornato! <strong>Attiva le notifiche</strong> per commenti e follow.</span>
      </div>
      <div className="install-prompt-actions">
        <button className="install-btn" onClick={handleEnable} disabled={isSubscribing}>
          {isSubscribing ? 'Attivazione...' : 'Attiva'}
        </button>
        <button className="close-btn" onClick={handleClose}>
          <MdClose size={20} />
        </button>
      </div>
    </div>
  );
}

export default EnableNotificationsPrompt;
