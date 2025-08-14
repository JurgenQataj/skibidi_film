const Review = require("../models/Review");
const Movie = require("../models/Movie");
const User = require("../models/User");
const axios = require("axios");
const mongoose = require("mongoose");

// Aggiungere una recensione
exports.addReview = async (req, res) => {
  const { tmdbId, rating, comment_text, is_spoiler } = req.body;
  const userId = req.user.id;

  if (!tmdbId || rating === undefined) {
    return res
      .status(400)
      .json({ message: "ID del film e valutazione sono obbligatori." });
  }

  try {
    let movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (!movie) {
      const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
      const tmdbResponse = await axios.get(tmdbUrl);
      const movieData = tmdbResponse.data;
      movie = new Movie({
        tmdb_id: movieData.id,
        title: movieData.title,
        poster_path: movieData.poster_path,
      });
      await movie.save();
    }

    const existingReview = await Review.findOne({
      user: userId,
      movie: movie._id,
    });
    if (existingReview) {
      return res
        .status(409)
        .json({ message: "Hai già recensito questo film." });
    }

    const newReview = new Review({
      user: userId,
      movie: movie._id,
      rating,
      comment_text,
      is_spoiler,
    });
    await newReview.save();

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
      .populate("user", "username avatar_url _id") // Popola i dati dell'utente
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

    // Formattiamo i dati per il frontend
    const formattedReviews = reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      comment_text: review.comment_text,
      is_spoiler: review.is_spoiler,
      created_at: review.createdAt,
      user_id: review.user._id,
      username: review.user.username,
      reactions: review.reactions.reduce((acc, reaction) => {
        acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
        return acc;
      }, {}),
      comment_count: review.comments.length,
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
