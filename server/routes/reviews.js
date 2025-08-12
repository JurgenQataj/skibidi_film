const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// Rotta per aggiungere una recensione
router.post('/', authMiddleware, reviewController.addReview);

// Rotta per ottenere le recensioni di un film
router.get('/movie/:tmdbId', reviewController.getReviewsForMovie);

// NUOVA rotta per controllare se l'utente ha già recensito
router.get('/status/:tmdbId', authMiddleware, reviewController.checkUserReviewStatus);

// Rotta per eliminare una recensione
router.delete('/:reviewId', authMiddleware, reviewController.deleteReview);

module.exports = router;