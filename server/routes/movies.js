const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

router.get("/search", movieController.searchMovies);
router.get("/discover", movieController.discoverMovies);
router.get("/suggestions", movieController.getMovieSuggestions);
router.get("/trending", movieController.getTrendingMovies);
router.get("/top-rated", movieController.getTopRatedMovies);

// --- ROTTA SPECIALE PER AGGIORNAMENTO DATI ---
// Visita questa rotta una volta dal browser per aggiornare tutto il DB
router.get("/admin/update-all-data", movieController.updateAllMoviesData);

router.get("/:tmdbId", movieController.getMovieDetails);

module.exports = router;