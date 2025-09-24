const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

// ENDPOINT DI TEST per debug
router.get("/test", (req, res) => {
  res.json({
    message: "Route funziona!",
    hasApiKey: !!process.env.TMDB_API_KEY,
    query: req.query,
  });
});

// Route suggestions
router.get("/suggestions", movieController.getMovieSuggestions);

// Altre route esistenti
router.get("/search", movieController.searchMovies);
router.get("/trending/week", movieController.getTrendingMovies);
router.get("/top-rated/internal", movieController.getTopRatedMovies);
router.get("/:tmdbId", movieController.getMovieDetails);

module.exports = router;
