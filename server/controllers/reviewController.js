const Review = require("../models/Review");
const Movie = require("../models/Movie");
const User = require("../models/User");
const Notification = require("../models/Notification");
const userController = require("./userController");
const axios = require("axios");

// Estrae @username dal testo e restituisce gli ID utenti trovati
async function extractMentions(text) {
  if (!text) return [];
  const mentionRegex = /@(\w+)/g;
  const usernames = [];
  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    usernames.push(match[1]);
  }
  if (usernames.length === 0) return [];
  const users = await User.find({ username: { $in: usernames } }).select("_id");
  return users.map((u) => u._id);
}

// Aggiungere una recensione
exports.addReview = async (req, res) => {
  const { tmdbId, rating, comment_text, is_spoiler, mediaType = "movie" } = req.body;
  const userId = req.user.id;

  if (!tmdbId || rating === undefined) {
    return res
      .status(400)
      .json({ message: "ID del contenuto e valutazione sono obbligatori." });
  }

  // VALIDAZIONE RATING
  if (rating < 0 || rating > 10) {
      return res.status(400).json({ message: "Il voto deve essere compreso tra 0 e 10." });
  }

  try {
    // 1. Cerca il film nel DB locale
    const movieQuery = {
      tmdb_id: tmdbId,
      $or: [
        { media_type: mediaType },
        ...(mediaType === "movie" ? [{ media_type: { $exists: false } }] : [])
      ]
    };
    let movie = await Movie.findOne(movieQuery);

    // 2. Se il film non esiste O se mancano dati cruciali (regista/cast/anno/generi), scaricali da TMDB
    if (!movie || !movie.director || !movie.cast || movie.cast.length === 0 || !movie.release_year || !movie.genres || movie.genres.length === 0) {
      console.log(`[INFO] Aggiornamento dati ${mediaType} ID ${tmdbId} da TMDB...`);
      
      const tmdbUrl = mediaType === "tv" 
        ? `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT&append_to_response=credits,keywords`
        : `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT&append_to_response=credits,keywords`;
      
      try {
        const tmdbResponse = await axios.get(tmdbUrl);
        const movieData = tmdbResponse.data;

        // Estrazione Anno
        const releaseYear = mediaType === "tv"
          ? (movieData.first_air_date ? new Date(movieData.first_air_date).getFullYear() : null)
          : (movieData.release_date ? new Date(movieData.release_date).getFullYear() : null);

        // Estrazione Regista (Director / Creator)
        let director = "Sconosciuto";
        if (mediaType === "tv") {
          const creatorData = movieData.created_by && movieData.created_by.length > 0 ? movieData.created_by[0] : null;
          director = creatorData ? creatorData.name : "Sconosciuto";
        } else {
          const directorData = movieData.credits?.crew?.find(c => c.job === "Director");
          director = directorData ? directorData.name : "Sconosciuto";
        }

        // Estrazione Cast (Top 5 attori)
        const cast = movieData.credits?.cast?.slice(0, 5).map(c => c.name) || [];

        // Estrazione Generi
        const genres = movieData.genres?.map(g => g.name) || [];

        // Estrazione Parole Chiave
        let keywords = [];
        if (mediaType === "tv") {
           keywords = movieData.keywords?.results?.map(k => k.name) || [];
        } else {
           keywords = movieData.keywords?.keywords?.map(k => k.name) || [];
        }

        const title = mediaType === "tv" ? movieData.name : movieData.title;

        // Estrazione Crew per stats future
        const fullCrew = movieData.credits?.crew || [];
        const production_companies = movieData.production_companies?.map(c => c.name) || [];

        const targetJobs = [
          "Special Effects", "Visual Effects Supervisor", "VFX Artist",
          "Original Music Composer", "Sound Designer", "Sound Mixer", "Original Song Writer",
          "Songs", "Lyrics",
          "Producer", "Executive Producer",
          "Director of Photography", "Camera Operator", "Lighting Technician", "Gaffer",
          "Production Design", "Art Direction", "Set Decoration",
          "Writer", "Screenplay", "Original Story", "Characters"
        ];

        const crew = fullCrew
          .filter(c => targetJobs.includes(c.job))
          .map(c => {
            let job = c.job;
            if (job === "Songs" || job === "Lyrics") job = "Original Song Writer";
            return { name: c.name, job: job };
          });

        const runtime = movieData.runtime || 0;
        const production_countries = movieData.production_countries?.map(c => c.name) || [];
        const original_language = movieData.original_language || null;

        if (!movie) {
          // Creazione nuovo film
          movie = new Movie({
            tmdb_id: movieData.id,
            media_type: mediaType,
            title: title,
            poster_path: movieData.poster_path,
            release_year: releaseYear,
            director: director,
            cast: cast,
            genres: genres,
            collection_info: movieData.belongs_to_collection ? {
              id: movieData.belongs_to_collection.id,
              name: movieData.belongs_to_collection.name,
              poster_path: movieData.belongs_to_collection.poster_path,
              backdrop_path: movieData.belongs_to_collection.backdrop_path
            } : null,
            production_companies,
            crew,
            runtime,
            production_countries,
            original_language,
            keywords
          });
          await movie.save();
        } else {
          // Aggiornamento film esistente (Self-healing)
          movie.title = title;
          movie.release_year = releaseYear;
          movie.director = director;
          movie.cast = cast;
          movie.genres = genres;
          
          movie.production_companies = production_companies;
          movie.crew = crew;
          movie.runtime = runtime;
          movie.production_countries = production_countries;
          movie.original_language = original_language;
          movie.keywords = keywords;

          if (movieData.belongs_to_collection) {
            movie.collection_info = {
              id: movieData.belongs_to_collection.id,
              name: movieData.belongs_to_collection.name,
              poster_path: movieData.belongs_to_collection.poster_path,
              backdrop_path: movieData.belongs_to_collection.backdrop_path
            };
          } else {
            movie.collection_info = null;
          }
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

    try {
      if (comment_text) {
        const mentionedIds = await extractMentions(comment_text);
        const validMentions = mentionedIds.filter(id => id.toString() !== userId);
        for (const mentionId of validMentions) {
          const mentionNotif = new Notification({
            recipient: mentionId,
            sender: userId,
            type: "review_mention",
            targetReview: newReview._id,
          });
          await mentionNotif.save();
        }
      }
    } catch (mentionNotifError) {
      console.log("⚠️ Errore notifica menzione recensione:", mentionNotifError.message);
    }

    // Rimuovi dalla watchlist se presente
    await User.findByIdAndUpdate(userId, { $pull: { watchlist: movie._id } });

    // 5. Sync collezioni (AWAITED per live update)
    await userController.syncUserCollections(userId);

    res.status(201).json({ message: "Recensione aggiunta con successo!" });
  } catch (error) {
    console.error("Errore aggiunta recensione:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Ottenere le recensioni per un film
exports.getReviewsForMovie = async (req, res) => {
  try {
    const { mediaType = "movie" } = req.query;
    const movieQuery = {
      tmdb_id: req.params.tmdbId,
      $or: [
        { media_type: mediaType },
        ...(mediaType === "movie" ? [{ media_type: { $exists: false } }] : [])
      ]
    };
    const movie = await Movie.findOne(movieQuery);
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
      user_reactions: review.reactions || [],
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
    const { mediaType = "movie" } = req.query;
    const movieQuery = {
      tmdb_id: req.params.tmdbId,
      $or: [
        { media_type: mediaType },
        ...(mediaType === "movie" ? [{ media_type: { $exists: false } }] : [])
      ]
    };
    const movie = await Movie.findOne(movieQuery);
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

    // Sync collezioni (AWAITED per live update) dopo eliminazione
    await userController.syncUserCollections(req.user.id);

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