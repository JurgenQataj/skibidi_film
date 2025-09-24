const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

// Route per ricerca con suggerimenti
router.get("/suggestions", movieController.getMovieSuggestions);

// Route per ricerca completa
router.get("/search", movieController.searchMovies);

// Route per dettagli film
router.get("/:tmdbId", movieController.getMovieDetails);

// Route per film di tendenza
router.get("/trending/week", movieController.getTrendingMovies);

// Route per film top rated
router.get("/top-rated/internal", movieController.getTopRatedMovies);

module.exports = router;
