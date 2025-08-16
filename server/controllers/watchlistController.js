const User = require("../models/User");
const Movie = require("../models/Movie");
const axios = require("axios");

/**
 * Funzione di utilità per trovare un film nel nostro DB o crearlo se non esiste.
 * Questo evita la duplicazione di codice.
 * @param {string} tmdbId L'ID del film su The Movie Database.
 * @returns {Promise<Document>} Il documento del film Mongoose.
 */
const findOrCreateMovie = async (tmdbId) => {
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
  return movie;
};

// Aggiungere un film alla watchlist
exports.addToWatchlist = async (req, res) => {
  const { tmdbId } = req.body;
  const { id: userId } = req.user;

  if (!tmdbId) {
    return res.status(400).json({ message: "ID del film TMDB mancante." });
  }

  try {
    const movie = await findOrCreateMovie(tmdbId);

    await User.findByIdAndUpdate(userId, {
      $addToSet: { watchlist: movie._id }, // $addToSet previene i duplicati
    });

    res
      .status(200)
      .json({ message: `'${movie.title}' aggiunto alla watchlist.` });
  } catch (error) {
    console.error("Errore aggiunta alla watchlist:", error);
    res
      .status(500)
      .json({
        message: "Errore del server durante l'aggiunta alla watchlist.",
      });
  }
};

// Rimuovere un film dalla watchlist
exports.removeFromWatchlist = async (req, res) => {
  const { tmdbId } = req.params;
  const { id: userId } = req.user;

  try {
    const movie = await Movie.findOne({ tmdb_id: tmdbId });

    if (!movie) {
      // Se il film non è nel nostro DB, non può essere in nessuna watchlist.
      return res
        .status(200)
        .json({ message: "Film già rimosso o mai aggiunto." });
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { watchlist: movie._id },
    });

    res
      .status(200)
      .json({ message: `'${movie.title}' rimosso dalla watchlist.` });
  } catch (error) {
    console.error("Errore rimozione dalla watchlist:", error);
    res
      .status(500)
      .json({
        message: "Errore del server durante la rimozione dalla watchlist.",
      });
  }
};

// Ottenere la watchlist di un utente
exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("watchlist");
    if (!user) {
      return res.status(404).json({ message: "Utente non trovato." });
    }
    res.status(200).json(user.watchlist);
  } catch (error) {
    console.error("Errore nel recupero della watchlist:", error);
    res
      .status(500)
      .json({ message: "Errore del server nel recupero della watchlist." });
  }
};

// Controllare se un film è nella watchlist dell'utente loggato
exports.getWatchlistStatus = async (req, res) => {
  const { tmdbId } = req.params;
  const { id: userId } = req.user;

  try {
    const movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (!movie) {
      return res.json({ isInWatchlist: false });
    }

    const user = await User.findById(userId);

    const isInWatchlist = user.watchlist.some(
      (id) => id.toString() === movie._id.toString()
    );

    res.status(200).json({ isInWatchlist });
  } catch (error) {
    console.error("Errore nel controllo status watchlist:", error);
    res
      .status(500)
      .json({ message: "Errore del server nel controllo status watchlist." });
  }
};
