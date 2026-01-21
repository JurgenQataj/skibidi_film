const Review = require("../models/Review");
const Movie = require("../models/Movie");
const User = require("../models/User");
const axios = require("axios");

// Aggiungere una recensione
exports.addReview = async (req, res) => {
  const { tmdbId, rating, comment_text, is_spoiler } = req.body;
  const userId = req.user.id;

  if (!tmdbId || rating === undefined) {
    return res
      .status(400)
      .json({ message: "ID del film e valutazione sono obbligatori." });
  }

  // VALIDAZIONE RATING
  if (rating < 0 || rating > 10) {
      return res.status(400).json({ message: "Il voto deve essere compreso tra 0 e 10." });
  }

  try {
    // 1. Cerca il film nel DB locale
    let movie = await Movie.findOne({ tmdb_id: tmdbId });

    // 2. Se il film non esiste O se mancano dati cruciali (regista/cast/anno), scaricali da TMDB
    if (!movie || !movie.director || !movie.cast || movie.cast.length === 0 || !movie.release_year) {
      console.log(`[INFO] Aggiornamento dati film ID ${tmdbId} da TMDB...`);
      
      const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT&append_to_response=credits`;
      
      try {
        const tmdbResponse = await axios.get(tmdbUrl);
        const movieData = tmdbResponse.data;

        // Estrazione Anno
        const releaseYear = movieData.release_date 
          ? new Date(movieData.release_date).getFullYear() 
          : null;

        // Estrazione Regista (Director)
        const directorData = movieData.credits?.crew?.find(c => c.job === "Director");
        const director = directorData ? directorData.name : "Sconosciuto";

        // Estrazione Cast (Top 5 attori)
        const cast = movieData.credits?.cast?.slice(0, 5).map(c => c.name) || [];

        if (!movie) {
          // Creazione nuovo film
          movie = new Movie({
            tmdb_id: movieData.id,
            title: movieData.title,
            poster_path: movieData.poster_path,
            release_year: releaseYear,
            director: director,
            cast: cast,
          });
          await movie.save();
        } else {
          // Aggiornamento film esistente (Self-healing)
          movie.release_year = releaseYear;
          movie.director = director;
          movie.cast = cast;
          await movie.save();
        }
      } catch (apiError) {
        console.error("Errore TMDB durante il salvataggio film:", apiError.message);
        // Se fallisce TMDB ma il film non esiste, non possiamo creare la recensione
        if (!movie) {
          return res.status(502).json({ message: "Impossibile recuperare i dati del film." });
        }
        // Se il film esisteva già, procediamo anche senza aggiornarlo
      }
    }

    // 3. Controllo se l'utente ha già recensito
    const existingReview = await Review.findOne({
      user: userId,
      movie: movie._id,
    });
    if (existingReview) {
      return res
        .status(409)
        .json({ message: "Hai già recensito questo film." });
    }

    // 4. Creazione Recensione
    const newReview = new Review({
      user: userId,
      movie: movie._id,
      rating,
      comment_text,
      is_spoiler,
    });
    await newReview.save();

    // Rimuovi dalla watchlist se presente
    await User.findByIdAndUpdate(userId, { $pull: { watchlist: movie._id } });

    res.status(201).json({ message: "Recensione aggiunta con successo!" });
  } catch (error) {
    console.error("Errore aggiunta recensione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Ottenere le recensioni per un film
exports.getReviewsForMovie = async (req, res) => {
  try {
    const movie = await Movie.findOne({ tmdb_id: req.params.tmdbId });
    if (!movie) {
      return res
        .status(200)
        .json({ averageRating: "0.0", reviewCount: 0, reviews: [] });
    }

    const reviews = await Review.find({ movie: movie._id })
      .populate("user", "username avatar_url _id")
      .sort({ createdAt: -1 });

    const stats = await Review.aggregate([
      { $match: { movie: movie._id } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 },
        },
      },
    ]);

    const formattedReviews = reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      comment_text: review.comment_text,
      is_spoiler: review.is_spoiler,
      created_at: review.createdAt,
      user_id: review.user ? review.user._id : null,
      username: review.user ? review.user.username : "Utente eliminato",
      avatar_url: review.user ? review.user.avatar_url : null,
      reactions: review.reactions ? review.reactions.reduce((acc, reaction) => {
        acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
        return acc;
      }, {}) : {},
      comment_count: review.comments ? review.comments.length : 0,
    }));

    res.json({
      averageRating:
        stats.length > 0 ? stats[0].averageRating.toFixed(1) : "0.0",
      reviewCount: stats.length > 0 ? stats[0].reviewCount : 0,
      reviews: formattedReviews,
    });
  } catch (error) {
    console.error("Errore recupero recensioni:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Controllare se l'utente ha già recensito
exports.checkUserReviewStatus = async (req, res) => {
  try {
    const movie = await Movie.findOne({ tmdb_id: req.params.tmdbId });
    if (!movie) return res.json({ hasReviewed: false });

    const review = await Review.findOne({
      movie: movie._id,
      user: req.user.id,
    });
    res.json({ hasReviewed: !!review });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Eliminare una recensione
exports.deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review)
      return res.status(404).json({ message: "Recensione non trovata." });

    if (review.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({
          message: "Non hai i permessi per eliminare questa recensione.",
        });
    }

    await review.deleteOne();
    res.json({ message: "Recensione eliminata con successo." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Aggiornare una recensione
exports.updateReview = async (req, res) => {
  const { rating, comment_text, is_spoiler } = req.body;
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review)
      return res.status(404).json({ message: "Recensione non trovata." });

    if (review.user.toString() !== req.user.id) {
       return res.status(403).json({ message: "Non hai i permessi." });
    }

    if (rating !== undefined) {
        if (rating < 0 || rating > 10) {
            return res.status(400).json({ message: "Il voto deve essere compreso tra 0 e 10." });
        }
        review.rating = rating;
    }
    if (comment_text !== undefined) review.comment_text = comment_text;
    if (is_spoiler !== undefined) review.is_spoiler = is_spoiler;

    await review.save();
    res.json(review);
  } catch (error) {
    console.error("Errore aggiornamento recensione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};