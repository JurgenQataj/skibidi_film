const Movie = require("../models/Movie");
const Review = require("../models/Review");
const axios = require("axios");

// Funzione per cercare film su TMDB (invariata)
exports.searchMovies = async (req, res) => {
  const searchQuery = req.query.query;
  if (!searchQuery) {
    return res
      .status(400)
      .json({ message: "Per favore, fornisci un testo per la ricerca." });
  }
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${searchQuery}&language=it-IT`;
  try {
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Errore durante la comunicazione con il servizio esterno.",
      });
  }
};

// Funzione per ottenere tutti i dettagli di un film (invariata)
exports.getMovieDetails = async (req, res) => {
  const { tmdbId } = req.params;
  const movieDetailsUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
  const creditsUrl = `https://api.themoviedb.org/3/movie/${tmdbId}/credits?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
  try {
    const [detailsResponse, creditsResponse] = await Promise.all([
      axios.get(movieDetailsUrl),
      axios.get(creditsUrl),
    ]);
    const movieDetails = detailsResponse.data;
    const credits = creditsResponse.data;
    const director = credits.crew.find((member) => member.job === "Director");
    const cast = credits.cast.slice(0, 10);

    const responseData = {
      id: movieDetails.id,
      title: movieDetails.title,
      overview: movieDetails.overview,
      poster_path: movieDetails.poster_path,
      backdrop_path: movieDetails.backdrop_path,
      release_date: movieDetails.release_date,
      genres: movieDetails.genres,
      budget: movieDetails.budget,
      revenue: movieDetails.revenue,
      original_language: movieDetails.original_language,
      director: director || null,
      cast: cast,
    };
    res.json(responseData);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ message: "Film non trovato." });
    }
    res
      .status(500)
      .json({
        message: "Errore durante la comunicazione con il servizio esterno.",
      });
  }
};

// Funzione per ottenere i film del momento da TMDB (invariata)
exports.getTrendingMovies = async (req, res) => {
  const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
  try {
    const response = await axios.get(url);
    res.json(response.data.results);
  } catch (error) {
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};

// Funzione per ottenere i film più votati su Skibidi Film (versione MongoDB)
exports.getTopRatedMovies = async (req, res) => {
  try {
    const topMovies = await Review.aggregate([
      // Raggruppa le recensioni per film e calcola la media dei voti
      { $group: { _id: "$movie", average_rating: { $avg: "$rating" } } },
      // Ordina i risultati dalla media più alta
      { $sort: { average_rating: -1 } },
      // Prendi solo i primi 10
      { $limit: 10 },
      // "Popola" i dati del film recuperando i dettagli dalla collezione 'movies'
      {
        $lookup: {
          from: "movies",
          localField: "_id",
          foreignField: "_id",
          as: "movie_details",
        },
      },
      // Espandi l'array 'movie_details'
      { $unwind: "$movie_details" },
      // Seleziona solo i campi che ci interessano per la risposta finale
      {
        $project: {
          _id: 0, // escludi l'ID del gruppo
          tmdb_id: "$movie_details.tmdb_id",
          title: "$movie_details.title",
          poster_path: "$movie_details.poster_path",
          average_rating: { $round: ["$average_rating", 1] }, // Arrotonda la media a 1 decimale
        },
      },
    ]);
    res.json(topMovies);
  } catch (error) {
    console.error("Errore nel recupero dei film più votati:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
