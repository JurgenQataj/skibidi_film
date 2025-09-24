const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

// IMPORTANTE: suggestions DEVE essere prima di search e :tmdbId
router.get("/suggestions", movieController.getMovieSuggestions);

// Route esistenti (invariate)
router.get("/search", movieController.searchMovies);
router.get("/trending/week", movieController.getTrendingMovies);
router.get("/top-rated/internal", movieController.getTopRatedMovies);
router.get("/:tmdbId", movieController.getMovieDetails);

module.exports = router;
