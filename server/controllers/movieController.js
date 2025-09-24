const Movie = require("../models/Movie");
const Review = require("../models/Review");
const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// SUGGERIMENTI - Versione sicura
exports.getMovieSuggestions = async (req, res) => {
  try {
    const searchQuery = req.query.query;

    if (!searchQuery || searchQuery.length < 2) {
      return res.json({ results: [] });
    }

    if (!API_KEY) {
      return res.status(500).json({
        message: "API key not configured",
        results: [],
      });
    }

    const url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(
      searchQuery
    )}&language=it-IT&page=1`;

    const response = await axios.get(url);

    const suggestions = response.data.results.slice(0, 5).map((movie) => ({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      release_date: movie.release_date,
    }));

    res.json({ results: suggestions });
  } catch (error) {
    console.error("Errore suggestions:", error.message);
    res.status(500).json({
      message: error.message,
      results: [],
    });
  }
};

// Resto del codice come prima...
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
      recommendations: data.recommendations?.results || [],
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

exports.getTrendingMovies = async (req, res) => {
  try {
    const url = `${BASE_URL}/trending/movie/week?api_key=${API_KEY}&language=it-IT`;
    const response = await axios.get(url);
    res.json(response.data.results);
  } catch (error) {
    console.error("Errore film di tendenza:", error.message);
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
