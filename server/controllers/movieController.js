const Movie = require("../models/Movie");
const Review = require("../models/Review");
const axios = require("axios");

// Carica la API key in modo sicuro dalle variabili d'ambiente
const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// -------------------------
// CERCA FILM
// -------------------------
exports.searchMovies = async (req, res) => {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res
      .status(400)
      .json({ message: "Per favore, fornisci un testo per la ricerca." });
  }
  try {
    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      searchQuery
    )}&language=it-IT`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Errore ricerca film:", error.message);
    res.status(500).json({
      message: "Errore durante la comunicazione con il servizio esterno.",
    });
  }
};

exports.getMovieDetails = async (req, res) => {
  const { tmdbId } = req.params;

  // Sicurezza: Valida l'input
  if (!/^\d+$/.test(tmdbId)) {
    return res.status(400).json({ message: "ID del film non valido." });
  }

  const url = `${BASE_URL}/movie/${tmdbId}?api_key=${API_KEY}&language=it-IT&append_to_response=credits,recommendations`;

  try {
    const response = await axios.get(url);
    const data = response.data;

    const credits = data.credits;
    const director = credits?.crew?.find((member) => member.job === "Director");
    const cast = credits?.cast?.slice(0, 10) || [];

    //  LA MODIFICA È QUI
    res.json({
      id: data.id,
      title: data.title,
      overview: data.overview,
      poster_path: data.poster_path,
      backdrop_path: data.backdrop_path,
      release_date: data.release_date,
      genres: data.genres,
      budget: data.budget,
      revenue: data.revenue,
      original_language: data.original_language,
      director: director || null,
      cast: cast,
      recommendations: data.recommendations?.results || [], // Aggiungiamo recommendations qui
    });
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: "Film non trovato." });
    }
    console.error("Errore recupero dettagli film:", error.message);
    res.status(500).json({
      message: "Errore di comunicazione con il servizio esterno.",
    });
  }
};

// Modificato per accettare 'day' o 'week' come parametro
exports.getTrendingMovies = async (req, res) => {
  const { time_window = "week" } = req.query; // 'week' è il default
  if (!["day", "week"].includes(time_window)) {
    return res.status(400).json({ message: "Time window non valido." });
  }
  try {
    const url = `${BASE_URL}/trending/movie/${time_window}?api_key=${API_KEY}&language=it-IT`;
    const response = await axios.get(url);
    res.json(response.data.results);
  } catch (error) {
    console.error("Errore film di tendenza:", error.message);
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};

// Nuovo: Ottiene i film più popolari in un dato intervallo di date
exports.getPopularMovies = async (req, res) => {
  const { start_date, end_date } = req.query;
  try {
    let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=it-IT&sort_by=popularity.desc`;
    if (start_date) url += `&primary_release_date.gte=${start_date}`;
    if (end_date) url += `&primary_release_date.lte=${end_date}`;

    const response = await axios.get(url);
    res.json(response.data.results);
  } catch (error) {
    console.error("Errore film popolari:", error.message);
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};

// Nuovo: Ottiene i film con più recensioni nel DB locale
exports.getMostReviewedMovies = async (req, res) => {
  try {
    const mostReviewed = await Review.aggregate([
      { $group: { _id: "$movie", review_count: { $sum: 1 } } },
      { $sort: { review_count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "movies",
          localField: "_id",
          foreignField: "_id",
          as: "movie_details",
        },
      },
      { $unwind: "$movie_details" },
      {
        $project: {
          _id: 0,
          tmdb_id: "$movie_details.tmdb_id",
          title: "$movie_details.title",
          poster_path: "$movie_details.poster_path",
          review_count: "$review_count",
        },
      },
    ]);
    res.json(mostReviewed);
  } catch (error) {
    console.error("Errore recupero più recensiti:", error.message);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Nuovo: Ottiene la lista dei generi
exports.getGenres = async (req, res) => {
  try {
    const url = `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=it-IT`;
    const response = await axios.get(url);
    res.json(response.data.genres);
  } catch (error) {
    console.error("Errore recupero generi:", error.message);
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};

// Nuovo: Ottiene i film per genere
exports.getMoviesByGenre = async (req, res) => {
  const { genreId } = req.params;
  if (!/^\d+$/.test(genreId)) {
    return res.status(400).json({ message: "ID genere non valido." });
  }
  try {
    const url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=it-IT&with_genres=${genreId}&sort_by=popularity.desc`;
    const response = await axios.get(url);
    res.json(response.data.results);
  } catch (error) {
    console.error("Errore recupero film per genere:", error.message);
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};

exports.getTopRatedMovies = async (req, res) => {
  try {
    const topMovies = await Review.aggregate([
      { $group: { _id: "$movie", average_rating: { $avg: "$rating" } } },
      { $sort: { average_rating: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "movies",
          localField: "_id",
          foreignField: "_id",
          as: "movie_details",
        },
      },
      { $unwind: "$movie_details" },
      {
        $project: {
          _id: 0,
          tmdb_id: "$movie_details.tmdb_id",
          title: "$movie_details.title",
          poster_path: "$movie_details.poster_path",
          average_rating: { $round: ["$average_rating", 1] },
        },
      },
    ]);
    res.json(topMovies);
  } catch (error) {
    console.error("Errore recupero top rated:", error.message);
    res.status(500).json({ message: "Errore del server." });
  }
};
