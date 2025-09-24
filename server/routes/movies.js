const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

// IMPORTANTISSIMO: Tutte le route specifiche PRIMA di /:tmdbId
router.get("/test", (req, res) => {
  res.json({
    message: "Endpoint test funziona!",
    hasApiKey: !!process.env.TMDB_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

router.get("/suggestions", movieController.getMovieSuggestions);
router.get("/search", movieController.searchMovies);
router.get("/trending/week", movieController.getTrendingMovies);
router.get("/top-rated/internal", movieController.getTopRatedMovies);

// QUESTA DEVE ESSERE SEMPRE L'ULTIMA!
router.get("/:tmdbId", movieController.getMovieDetails);

module.exports = router;
