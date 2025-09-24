const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

// ❗ IMPORTANTE: TUTTI gli endpoint specifici DEVONO venire PRIMA di /:tmdbId

// Endpoint di test
router.get("/test", (req, res) => {
  res.json({
    message: "Endpoint test funziona!",
    hasApiKey: !!process.env.TMDB_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Endpoint per suggestions
router.get("/suggestions", movieController.getMovieSuggestions);

// Endpoint per search
router.get("/search", movieController.searchMovies);

// Endpoint per trending
router.get("/trending/week", movieController.getTrendingMovies);

// Endpoint per top-rated
router.get("/top-rated/internal", movieController.getTopRatedMovies);

// ❗ QUESTA ROUTE DEVE ESSERE SEMPRE L'ULTIMA!
// Perché /:tmdbId cattura QUALSIASI cosa che non sia stata matchata prima
router.get("/:tmdbId", movieController.getMovieDetails);

module.exports = router;
