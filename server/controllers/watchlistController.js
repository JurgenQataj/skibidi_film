const User = require("../models/User");
const Movie = require("../models/Movie");
const axios = require("axios");

// Aggiungere un film alla watchlist
exports.addToWatchlist = async (req, res) => {
  const { tmdbId } = req.body;
  const userId = req.user.id;
  try {
    let movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (!movie) {
      // Se il film non è nel nostro DB, lo aggiungiamo
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

    // Aggiungiamo l'ID del film alla watchlist dell'utente ($addToSet evita duplicati)
    await User.findByIdAndUpdate(userId, {
      $addToSet: { watchlist: movie._id },
    });
    res.json({ message: "Film aggiunto alla watchlist." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Rimuovere un film dalla watchlist
exports.removeFromWatchlist = async (req, res) => {
  const { tmdbId } = req.params;
  const userId = req.user.id;
  try {
    const movie = await Movie.findOne({ tmdb_id: tmdbId });
    if (movie) {
      await User.findByIdAndUpdate(userId, { $pull: { watchlist: movie._id } });
    }
    res.json({ message: "Film rimosso dalla watchlist." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Ottenere la watchlist di un utente
exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("watchlist");
    if (!user) return res.status(404).json({ message: "Utente non trovato." });
    res.json(user.watchlist);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Controllare se un film è nella watchlist
exports.getWatchlistStatus = async (req, res) => {
  try {
    const movie = await Movie.findOne({ tmdb_id: req.params.tmdbId });
    if (!movie) return res.json({ isInWatchlist: false });

    const user = await User.findById(req.user.id);
    const isInWatchlist = user.watchlist.includes(movie._id);
    res.json({ isInWatchlist });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
