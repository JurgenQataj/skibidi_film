import { useRegisterSW } from 'virtual:pwa-register/react';
import './UpdatePrompt.css';

function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Controlla aggiornamenti ogni 60 secondi
      r && setInterval(() => r.update(), 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="update-prompt">
      <span>🎬 Nuova versione disponibile!</span>
      <button onClick={() => updateServiceWorker(true)}>
        Aggiorna ora
      </button>
    </div>
  );
}

export default UpdatePrompt;
