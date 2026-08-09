const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
// MODIFICA QUI: Importiamo 'protect' con le parentesi graffe
const { protect } = require('../middleware/authMiddleware');

// Ottenere le proprie notifiche (paginate)
router.get('/', protect, notificationController.getNotifications);

// Endpoint leggero per il conteggio non lette (polling)
router.get('/unread-count', protect, notificationController.getUnreadCount);

// Marcare le proprie notifiche come lette
router.put('/read', protect, notificationController.markAsRead);

module.exports = router;