const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reactionController');
// MODIFICA QUI: Usiamo le parentesi graffe per importare 'protect'
const { protect } = require('../middleware/authMiddleware');

// Aggiungere/modificare una reazione a una recensione
// MODIFICA QUI: Usiamo 'protect'
router.post('/reviews/:reviewId', protect, reactionController.addOrUpdateReaction);

// Rimuovere la propria reazione da una recensione
// MODIFICA QUI: Usiamo 'protect'
router.delete('/reviews/:reviewId', protect, reactionController.removeReaction);

module.exports = router;