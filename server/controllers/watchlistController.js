const User = require("../models/User");
const Movie = require("../models/Movie");
const axios = require("axios");

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

exports.addToWatchlist = async (req, res) => {
  const { tmdbId } = req.body;
  const userId = req.user.id;

  if (!tmdbId) return res.status(400).json({ message: "ID mancante." });

  try {
    const movie = await findOrCreateMovie(tmdbId);
    await User.findByIdAndUpdate(userId, { $addToSet: { watchlist: movie._id } });
    res.status(200).json({ message: "Aggiunto alla watchlist." });
  } catch (error) {
    console.error("Errore add watchlist:", error);
    res.status(500).json({ message: "Errore server." });
  }
};

exports.removeFromWatchlist = async (req, res) => {
  const { tmdbId } = req.params;
  const userId = req.user.id;

  try {
    const movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (!movie) return res.status(200).json({ message: "Non presente." });

    await User.findByIdAndUpdate(userId, { $pull: { watchlist: movie._id } });
    res.status(200).json({ message: "Rimosso." });
  } catch (error) {
    console.error("Errore remove watchlist:", error);
    res.status(500).json({ message: "Errore server." });
  }
};

exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("watchlist");
    if (!user) return res.status(404).json({ message: "Utente non trovato." });
    res.status(200).json(user.watchlist || []);
  } catch (error) {
    console.error("Errore get watchlist:", error);
    res.status(500).json({ message: "Errore server." });
  }
};

exports.getWatchlistStatus = async (req, res) => {
  const { tmdbId } = req.params;
  const userId = req.user.id;

  try {
    const movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (!movie) return res.json({ isInWatchlist: false });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utente non trovato." });

    // FIX DI SICUREZZA: Usiamo un array vuoto se watchlist è undefined
    const watchlist = user.watchlist || [];
    
    // Usiamo .some() che è più sicuro per gli ObjectId
    const isInWatchlist = watchlist.some(
      (id) => id.toString() === movie._id.toString()
    );

    res.status(200).json({ isInWatchlist });
  } catch (error) {
    console.error("Errore status watchlist:", error);
    res.status(500).json({ message: "Errore server." });
  }
};