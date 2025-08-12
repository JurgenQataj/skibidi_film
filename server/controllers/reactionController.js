const db = require('../config/database');

// Definiamo la lista delle reazioni permesse a livello di codice
const allowedReactions = [
    'like', 'dislike', 'laugh', 'love', 'wow', 'think', 'sad', 'pray', 
    'fire', 'party', 'mindblown', 'sleep', 'sick', 'nerd', 'clown', 
    'skull', 'onehundred', 'robot', 'alien', 'diamond'
];

// Funzione per aggiungere o modificare una reazione
exports.addOrUpdateReaction = async (req, res) => {
    const { reviewId } = req.params;
    const { reaction_type } = req.body;
    const userId = req.user.id;

    if (!reaction_type) {
        return res.status(400).json({ message: 'Il tipo di reazione è obbligatorio.' });
    }

    // NUOVO CONTROLLO: Verifichiamo che la reazione sia nella nostra lista
    if (!allowedReactions.includes(reaction_type)) {
        return res.status(400).json({ message: 'Tipo di reazione non valido.' });
    }

    try {
        await db.query(
            `INSERT INTO review_reactions (review_id, user_id, reaction_type) 
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE reaction_type = ?`,
            [reviewId, userId, reaction_type, reaction_type]
        );
        const [reviewAuthor] = await db.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId]);
        const recipientId = reviewAuthor[0].user_id;

        // Assicurati di non notificare un utente per una reazione a una propria recensione
        if (recipientId !== userId) {
            await db.query(
                'INSERT INTO notifications (recipient_id, sender_id, type, target_id) VALUES (?, ?, ?, ?)',
                [recipientId, userId, 'new_reaction', reviewId]
            );
        }

        res.status(200).json({ message: 'Reazione salvata.' });
    } catch (error) {
        console.error("Errore salvataggio reazione:", error);
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Funzione per rimuovere una reazione
exports.removeReaction = async (req, res) => {
    const { reviewId } = req.params;
    const userId = req.user.id;

    try {
        await db.query('DELETE FROM review_reactions WHERE review_id = ? AND user_id = ?', [reviewId, userId]);
        res.status(200).json({ message: 'Reazione rimossa.' });
    } catch (error) {
        console.error("Errore rimozione reazione:", error);
        res.status(500).json({ message: 'Errore del server.' });
    }
};