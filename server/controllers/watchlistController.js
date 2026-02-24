const User = require("../models/User");
const Movie = require("../models/Movie");
const axios = require("axios");

const findOrCreateMovie = async (tmdbId, mediaType = "movie") => {
  console.log(`[WATCHLIST] findOrCreateMovie: tmdbId=${tmdbId}, mediaType=${mediaType}`);
  const numericId = Number(tmdbId);
  
  // Cerchiamo il film. 
  // NOTA: Se l'indice è solo su tmdb_id, non possiamo avere due record con lo stesso tmdb_id ma mediaType diversi
  let movie = await Movie.findOne({ tmdb_id: numericId });
  
  if (!movie) {
    console.log(`[WATCHLIST] Movie not found in DB, fetching from TMDB: ${numericId}`);
    const tmdbUrl = mediaType === "tv"
      ? `https://api.themoviedb.org/3/tv/${numericId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`
      : `https://api.themoviedb.org/3/movie/${numericId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
      
    const tmdbResponse = await axios.get(tmdbUrl);
    const movieData = tmdbResponse.data;
    
    movie = new Movie({
      tmdb_id: movieData.id,
      media_type: mediaType,
      title: mediaType === "tv" ? movieData.name : movieData.title,
      poster_path: movieData.poster_path,
    });

    try {
      await movie.save();
      console.log(`[WATCHLIST] Movie saved to DB: ${movie.title}`);
    } catch (saveError) {
      // Se fallisce il salvataggio per duplicato (race condition), riproviamo a cercarlo
      if (saveError.code === 11000) {
        console.log(`[WATCHLIST] Race condition detected, fetching existing movie...`);
        movie = await Movie.findOne({ tmdb_id: numericId });
      } else {
        throw saveError;
      }
    }
  }
  return movie;
};

exports.addToWatchlist = async (req, res) => {
  const { tmdbId, mediaType = "movie" } = req.body;
  const userId = req.user.id;

  if (!tmdbId) return res.status(400).json({ message: "ID mancante." });

  try {
    const movie = await findOrCreateMovie(tmdbId, mediaType);
    console.log(`[WATCHLIST] Adding movie ${movie._id} to user ${userId}`);
    await User.findByIdAndUpdate(userId, { $addToSet: { watchlist: movie._id } });
    res.status(200).json({ message: "Aggiunto alla watchlist." });
  } catch (error) {
    console.error("Errore add watchlist:", error);
    res.status(500).json({ message: "Errore server." });
  }
};

exports.removeFromWatchlist = async (req, res) => {
  const { tmdbId } = req.params;
  const mediaType = req.query.mediaType || "movie";
  const userId = req.user.id;

  try {
    const movie = await Movie.findOne({ tmdb_id: tmdbId, media_type: mediaType });
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
  const mediaType = req.query.mediaType || "movie";
  const userId = req.user.id;

  try {
    const movie = await Movie.findOne({ tmdb_id: tmdbId, media_type: mediaType });
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