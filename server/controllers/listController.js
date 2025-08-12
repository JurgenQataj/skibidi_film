const db = require('../config/database');
const axios = require('axios');

// Funzione per creare una nuova lista
exports.createList = async (req, res) => {
    const { title, description } = req.body;
    const userId = req.user.id;
    if (!title) return res.status(400).json({ message: "Il titolo è obbligatorio." });
    try {
        await db.query('INSERT INTO movie_lists (user_id, title, description) VALUES (?, ?, ?)', [userId, title, description]);
        res.status(201).json({ message: 'Lista creata con successo!' });
    } catch (error) {
        console.error("Errore durante la creazione della lista:", error);
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Funzione per aggiungere un film a una lista
exports.addMovieToList = async (req, res) => {
    const { listId } = req.params;
    const { tmdbId } = req.body;
    const userId = req.user.id;
    try {
        const [lists] = await db.query('SELECT * FROM movie_lists WHERE id = ? AND user_id = ?', [listId, userId]);
        if (lists.length === 0) return res.status(403).json({ message: "Non hai i permessi per modificare questa lista." });
        
        let [movies] = await db.query('SELECT id FROM movies WHERE tmdb_id = ?', [tmdbId]);
        let localMovieId;
        if (movies.length === 0) {
            const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
            const tmdbResponse = await axios.get(tmdbUrl);
            const movieData = tmdbResponse.data;
            const [newMovie] = await db.query(
                'INSERT INTO movies (tmdb_id, title, poster_path, release_year) VALUES (?, ?, ?, ?)',
                [movieData.id, movieData.title, movieData.poster_path, new Date(movieData.release_date).getFullYear()]
            );
            localMovieId = newMovie.insertId;
        } else {
            localMovieId = movies[0].id;
        }
        await db.query('INSERT INTO list_items (list_id, movie_id) VALUES (?, ?)', [listId, localMovieId]);
        res.status(200).json({ message: 'Film aggiunto alla lista con successo!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Questo film è già in questa lista.' });
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Funzione per rimuovere un film da una lista
exports.removeMovieFromList = async (req, res) => {
    const { listId, tmdbId } = req.params;
    const userId = req.user.id;
    try {
        const [lists] = await db.query('SELECT * FROM movie_lists WHERE id = ? AND user_id = ?', [listId, userId]);
        if (lists.length === 0) return res.status(403).json({ message: "Non hai i permessi." });

        const [movies] = await db.query('SELECT id FROM movies WHERE tmdb_id = ?', [tmdbId]);
        if (movies.length === 0) return res.status(404).json({ message: 'Film non trovato.' });
        
        const localMovieId = movies[0].id;
        await db.query('DELETE FROM list_items WHERE list_id = ? AND movie_id = ?', [listId, localMovieId]);
        res.status(200).json({ message: 'Film rimosso dalla lista.' });
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Funzione per eliminare un'intera lista
exports.deleteList = async (req, res) => {
    const { listId } = req.params;
    const userId = req.user.id;
    try {
        const [lists] = await db.query('SELECT * FROM movie_lists WHERE id = ? AND user_id = ?', [listId, userId]);
        if (lists.length === 0) return res.status(403).json({ message: "Non hai i permessi." });
        await db.query('DELETE FROM movie_lists WHERE id = ?', [listId]);
        res.status(200).json({ message: 'Lista eliminata.' });
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Funzione per vedere i dettagli di una singola lista
exports.getListDetails = async (req, res) => {
    const { listId } = req.params;
    try {
        const [lists] = await db.query(
            `SELECT ml.id, ml.title, ml.description, u.username AS author
             FROM movie_lists AS ml JOIN users AS u ON ml.user_id = u.id
             WHERE ml.id = ?`,
            [listId]
        );
        if (lists.length === 0) return res.status(404).json({ message: "Lista non trovata." });
        
        const [movies] = await db.query(
            `SELECT m.tmdb_id, m.title, m.poster_path, m.release_year
             FROM list_items AS li JOIN movies AS m ON li.movie_id = m.id
             WHERE li.list_id = ?`,
            [listId]
        );
        res.json({ ...lists[0], movies });
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};