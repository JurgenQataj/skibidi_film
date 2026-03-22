import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import axios from 'axios';

// Interceptor globale per catturare e gestire i 401 (token scaduto)
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Se c'è un errore 401 e c'è un token salvato, significa che è scaduto o invalido
    if (error.response && error.response.status === 401) {
      if (localStorage.getItem('token')) {
        console.warn("Token JWT scaduto o non valido. Logout automatico in corso...");
        localStorage.removeItem('token');
        // Ricarichiamo la pagina per resettare lo stato (opzionale, ma consigliato per ripulire contesti utente/UI)
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <App />
  </React.StrictMode>,
);