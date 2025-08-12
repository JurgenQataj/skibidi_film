const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Ottenere tutte le proprie notifiche
router.get('/', authMiddleware, notificationController.getNotifications);

// Marcare le proprie notifiche come lette
router.put('/read', authMiddleware, notificationController.markAsRead);

module.exports = router;