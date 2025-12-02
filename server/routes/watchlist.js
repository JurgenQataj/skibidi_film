const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
// MODIFICA QUI: Importiamo 'protect' con le parentesi graffe
const { protect } = require('../middleware/authMiddleware');

// Aggiungere un film alla watchlist (utente loggato)
// MODIFICA QUI: Usiamo 'protect' invece di 'authMiddleware'
router.post('/', protect, watchlistController.addToWatchlist);

// Vedere la watchlist di un utente (pubblica)
router.get('/user/:userId', watchlistController.getWatchlist);

// Rimuovere un film dalla watchlist (utente loggato)
router.delete('/:tmdbId', protect, watchlistController.removeFromWatchlist);

// Controllare lo stato di un film nella watchlist (utente loggato)
router.get('/status/:tmdbId', protect, watchlistController.getWatchlistStatus);

module.exports = router;