const db = require('../config/database');
const axios = require('axios'); // Assicurati che axios sia importato

// Aggiungere un film alla propria watchlist (VERSIONE INTELLIGENTE)
exports.addToWatchlist = async (req, res) => {
    const userId = req.user.id;
    const { tmdbId } = req.body;

    if (!tmdbId) {
        return res.status(400).json({ message: "L'ID del film è obbligatorio." });
    }

    try {
        // 1. Controlliamo se il film è già nel nostro database locale
        let [movies] = await db.query('SELECT id FROM movies WHERE tmdb_id = ?', [tmdbId]);
        let localMovieId;

        if (movies.length === 0) {
            // 2. Se non c'è, lo cerchiamo su TMDB e lo aggiungiamo
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

        // 3. Ora inseriamo il film nella watchlist dell'utente
        await db.query('INSERT INTO watchlist (user_id, movie_id) VALUES (?, ?)', [userId, localMovieId]);
        res.status(200).json({ message: 'Film aggiunto alla watchlist.' });

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'Questo film è già nella tua watchlist.' });
        }
        console.error("Errore aggiunta watchlist:", error);
        res.status(500).json({ message: 'Errore del server.' });
    }
};


// --- Le altre funzioni rimangono invariate ---

// Vedere la watchlist di un utente
exports.getWatchlist = async (req, res) => {
    // ... (codice invariato)
    const { userId } = req.params;
    try {
        const [movies] = await db.query(
            `SELECT m.tmdb_id, m.title, m.poster_path FROM watchlist w JOIN movies m ON w.movie_id = m.id WHERE w.user_id = ?`,
            [userId]
        );
        res.json(movies);
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Rimuovere un film dalla propria watchlist
exports.removeFromWatchlist = async (req, res) => {
    // ... (codice invariato)
    const userId = req.user.id;
    const { tmdbId } = req.params;
    try {
        let [movies] = await db.query('SELECT id FROM movies WHERE tmdb_id = ?', [tmdbId]);
        if (movies.length === 0) {
            return res.status(404).json({ message: 'Film non trovato.' });
        }
        const localMovieId = movies[0].id;
        await db.query('DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?', [userId, localMovieId]);
        res.status(200).json({ message: 'Film rimosso dalla watchlist.' });
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};

// Controllare se un film è nella watchlist
exports.getWatchlistStatus = async (req, res) => {
    // ... (codice invariato)
    const userId = req.user.id;
    const { tmdbId } = req.params;
    try {
        const [movies] = await db.query('SELECT id FROM movies WHERE tmdb_id = ?', [tmdbId]);
        if (movies.length === 0) {
            return res.json({ isInWatchlist: false });
        }
        const localMovieId = movies[0].id;
        const [result] = await db.query('SELECT * FROM watchlist WHERE user_id = ? AND movie_id = ?', [userId, localMovieId]);
        res.json({ isInWatchlist: result.length > 0 });
    } catch (error) {
        res.status(500).json({ message: 'Errore del server.' });
    }
};