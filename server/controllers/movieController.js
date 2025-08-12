const axios = require("axios");
const db = require("../config/database");

// Funzione per cercare film su TMDB
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
    console.error("Errore durante la ricerca film su TMDB:", error.message);
    res
      .status(500)
      .json({
        message: "Errore durante la comunicazione con il servizio esterno.",
      });
  }
};

// Funzione per ottenere tutti i dettagli di un film, inclusi cast e regista
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
    console.error(
      "Errore nel recupero dei dettagli del film da TMDB:",
      error.message
    );
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

// Funzione per ottenere i film del momento da TMDB
exports.getTrendingMovies = async (req, res) => {
  const url = `https://api.themoviedb.org/3/trending/movie/week?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
  try {
    const response = await axios.get(url);
    res.json(response.data.results);
  } catch (error) {
    res.status(500).json({ message: "Errore del servizio esterno." });
  }
};

// Funzione per ottenere i film più votati su Skibidi Film
exports.getTopRatedMovies = async (req, res) => {
  try {
    const [movies] = await db.query(
      `SELECT m.tmdb_id, m.title, m.poster_path, AVG(r.rating) as average_rating
             FROM reviews AS r
             JOIN movies AS m ON r.movie_id = m.id
             GROUP BY m.id, m.tmdb_id, m.title, m.poster_path
             ORDER BY average_rating DESC
             LIMIT 10`
    );
    res.json(movies);
  } catch (error) {
    console.error("Errore nel recupero dei film più votati:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
