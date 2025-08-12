const db = require("../config/database");
const axios = require("axios");

exports.addReview = async (req, res) => {
  // Dati della recensione inviati dall'utente
  const { tmdbId, rating, comment_text, media_url, is_spoiler } = req.body;
  // Dati dell'utente che sta facendo la recensione (presi dal token)
  const userId = req.user.id;

  if (!tmdbId || rating === undefined) {
    return res
      .status(400)
      .json({ message: "ID del film e valutazione sono obbligatori." });
  }

  try {
    // 1. Controlliamo se il film è già nel nostro database locale
    let [movies] = await db.query("SELECT id FROM movies WHERE tmdb_id = ?", [
      tmdbId,
    ]);
    let localMovieId;

    if (movies.length === 0) {
      // 2. Se non c'è, lo cerchiamo su TMDB per prendere i suoi dati
      const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
      const tmdbResponse = await axios.get(tmdbUrl);
      const movieData = tmdbResponse.data;

      // e lo salviamo nel nostro database
      const [newMovie] = await db.query(
        "INSERT INTO movies (tmdb_id, title, poster_path, release_year) VALUES (?, ?, ?, ?)",
        [
          movieData.id,
          movieData.title,
          movieData.poster_path,
          new Date(movieData.release_date).getFullYear(),
        ]
      );
      localMovieId = newMovie.insertId;
    } else {
      // Se c'è già, prendiamo il suo ID locale
      localMovieId = movies[0].id;
    }

    // 3. Ora inseriamo la recensione nel database
    await db.query(
      "INSERT INTO reviews (user_id, movie_id, rating, comment_text, media_url, is_spoiler) VALUES (?, ?, ?, ?, ?, ?)",
      [
        userId,
        localMovieId,
        rating,
        comment_text,
        media_url,
        is_spoiler || false,
      ]
    );

    // <-- NUOVA RIGA: Rimuove il film dalla watchlist dopo la recensione
    await db.query("DELETE FROM watchlist WHERE user_id = ? AND movie_id = ?", [
      userId,
      localMovieId,
    ]);

    res.status(201).json({ message: "Recensione aggiunta con successo!" });
  } catch (error) {
    // Se l'errore ha codice 'ER_DUP_ENTRY', significa che l'utente ha già recensito questo film
    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ message: "Hai già recensito questo film." });
    }
    console.error("Errore durante l'aggiunta della recensione:", error);
    res
      .status(500)
      .json({
        message: "Errore del server durante l'aggiunta della recensione.",
      });
  }
};

exports.getReviewsForMovie = async (req, res) => {
  const { tmdbId } = req.params;
  try {
    const [movies] = await db.query("SELECT id FROM movies WHERE tmdb_id = ?", [
      tmdbId,
    ]);
    if (movies.length === 0) {
      return res
        .status(200)
        .json({ averageRating: "0.0", reviewCount: 0, reviews: [] });
    }
    const localMovieId = movies[0].id;

    const [reviews] = await db.query(
      `SELECT reviews.id, reviews.rating, reviews.comment_text, reviews.is_spoiler,
                reviews.created_at, reviews.user_id, users.username
            FROM reviews 
            JOIN users ON reviews.user_id = users.id 
            WHERE reviews.movie_id = ? 
            ORDER BY reviews.created_at DESC`,
      [localMovieId]
    );

    const reviewIds = reviews.map((r) => r.id);
    if (reviewIds.length > 0) {
      // Recuperiamo sia le reazioni sia il conteggio dei commenti in parallelo
      const [reactions, commentCounts] = await Promise.all([
        db
          .query(
            `SELECT review_id, reaction_type, COUNT(*) as count 
                     FROM review_reactions WHERE review_id IN (?) GROUP BY review_id, reaction_type`,
            [reviewIds]
          )
          .then((res) => res[0]),
        db
          .query(
            `SELECT review_id, COUNT(*) as count 
                     FROM review_comments WHERE review_id IN (?) GROUP BY review_id`,
            [reviewIds]
          )
          .then((res) => res[0]),
      ]);

      // Aggiungiamo i dati a ogni recensione
      reviews.forEach((review) => {
        // Reazioni
        review.reactions = {};
        reactions
          .filter((r) => r.review_id === review.id)
          .forEach((reaction) => {
            review.reactions[reaction.reaction_type] = reaction.count;
          });
        // Conteggio commenti
        const countData = commentCounts.find((c) => c.review_id === review.id);
        review.comment_count = countData ? countData.count : 0;
      });
    }

    const [stats] = await db.query(
      "SELECT AVG(rating) as averageRating, COUNT(*) as reviewCount FROM reviews WHERE movie_id = ?",
      [localMovieId]
    );

    res.json({
      averageRating: parseFloat(stats[0].averageRating || 0).toFixed(1),
      reviewCount: stats[0].reviewCount,
      reviews: reviews,
    });
  } catch (error) {
    console.error("Errore nel recupero delle recensioni:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
// Funzione per eliminare una recensione
exports.deleteReview = async (req, res) => {
  const { reviewId } = req.params;
  const userId = req.user.id; // ID dell'utente che sta facendo la richiesta

  try {
    // Prima verifichiamo che la recensione esista e appartenga all'utente
    const [reviews] = await db.query("SELECT * FROM reviews WHERE id = ?", [
      reviewId,
    ]);

    if (reviews.length === 0) {
      return res.status(404).json({ message: "Recensione non trovata." });
    }

    const review = reviews[0];

    if (review.user_id !== userId) {
      return res.status(403).json({
        message: "Non hai i permessi per eliminare questa recensione.",
      });
    }

    // Se i controlli passano, eliminiamo la recensione
    await db.query("DELETE FROM reviews WHERE id = ?", [reviewId]);
    res.status(200).json({ message: "Recensione eliminata con successo." });
  } catch (error) {
    console.error("Errore durante l'eliminazione della recensione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
// ===== INIZIA NUOVO CODICE DA AGGIUNGERE =====

// Funzione per controllare se l'utente ha già recensito un film
exports.checkUserReviewStatus = async (req, res) => {
  const { tmdbId } = req.params;
  const userId = req.user.id;

  try {
    const [movies] = await db.query("SELECT id FROM movies WHERE tmdb_id = ?", [
      tmdbId,
    ]);
    if (movies.length === 0) {
      return res.json({ hasReviewed: false });
    }
    const localMovieId = movies[0].id;

    const [reviews] = await db.query(
      "SELECT id FROM reviews WHERE movie_id = ? AND user_id = ?",
      [localMovieId, userId]
    );

    res.json({ hasReviewed: reviews.length > 0 });
  } catch (error) {
    console.error("Errore nel controllo dello stato della recensione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
