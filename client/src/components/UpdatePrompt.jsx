import { useRegisterSW } from 'virtual:pwa-register/react';
import './UpdatePrompt.css';

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Controlla aggiornamenti ogni 60 secondi
      r && setInterval(() => r.update(), 60 * 1000);
    },
  });

  const handleUpdate = () => {
    setNeedRefresh(false);
    updateServiceWorker(true);
  };

  if (!needRefresh) return null;

  return (
    <div className="update-prompt">
      <span>🎬 Nuova versione disponibile!</span>
      <button onClick={handleUpdate}>
        Aggiorna ora
      </button>
    </div>
  );
}

export default UpdatePrompt;
