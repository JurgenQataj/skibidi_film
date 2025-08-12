const db = require('../config/database');

// Aggiungere un commento a una recensione
exports.addComment = async (req, res) => {
    const { reviewId } = req.params;
    const { comment_text } = req.body;
    const userId = req.user.id;

    if (!comment_text) {
        return res.status(400).json({ message: 'Il testo del commento non può essere vuoto.' });
    }

    try {
        await db.query(
            'INSERT INTO review_comments (review_id, user_id, comment_text) VALUES (?, ?, ?)',
            [reviewId, userId, comment_text]
        );
        res.status(201).json({ message: 'Commento aggiunto.' });
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Ottenere tutti i commenti di una recensione
exports.getComments = async (req, res) => {
    const { reviewId } = req.params;
    try {
        const [comments] = await db.query(
            `SELECT c.*, u.username, u.avatar_url 
             FROM review_comments AS c 
             JOIN users AS u ON c.user_id = u.id 
             WHERE c.review_id = ? 
             ORDER BY c.created_at ASC`,
            [reviewId]
        );
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};