const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const authMiddleware = require('../middleware/authMiddleware');

// Aggiungere un film alla watchlist (utente loggato)
router.post('/', authMiddleware, watchlistController.addToWatchlist);

// Vedere la watchlist di un utente (pubblica)
router.get('/user/:userId', watchlistController.getWatchlist);

// Rimuovere un film dalla watchlist (utente loggato)
router.delete('/:tmdbId', authMiddleware, watchlistController.removeFromWatchlist);

// Controllare lo stato di un film nella watchlist (utente loggato)
router.get('/status/:tmdbId', authMiddleware, watchlistController.getWatchlistStatus);

module.exports = router;