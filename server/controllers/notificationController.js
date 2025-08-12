const db = require('../config/database');

// Ottenere le notifiche dell'utente loggato
exports.getNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const [notifications] = await db.query(
            `SELECT n.*, u.username AS sender_username 
             FROM notifications AS n 
             JOIN users AS u ON n.sender_id = u.id 
             WHERE n.recipient_id = ? 
             ORDER BY n.created_at DESC`,
            [userId]
        );
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Marcare tutte le notifiche come lette
exports.markAsRead = async (req, res) => {
    const userId = req.user.id;
    try {
        await db.query('UPDATE notifications SET is_read = TRUE WHERE recipient_id = ?', [userId]);
        res.json({ message: 'Notifiche segnate come lette.' });
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};