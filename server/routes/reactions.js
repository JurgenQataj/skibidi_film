const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reactionController');
const authMiddleware = require('../middleware/authMiddleware');

// Aggiungere/modificare una reazione a una recensione
router.post('/reviews/:reviewId', authMiddleware, reactionController.addOrUpdateReaction);

// Rimuovere la propria reazione da una recensione
router.delete('/reviews/:reviewId', authMiddleware, reactionController.removeReaction);

module.exports = router;