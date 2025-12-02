const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
// MODIFICA QUI: Importiamo 'protect' con le parentesi graffe
const { protect } = require('../middleware/authMiddleware');

// Ottenere tutte le proprie notifiche
// MODIFICA QUI: Usiamo 'protect'
router.get('/', protect, notificationController.getNotifications);

// Marcare le proprie notifiche come lette
// MODIFICA QUI: Usiamo 'protect'
router.put('/read', protect, notificationController.markAsRead);

module.exports = router;