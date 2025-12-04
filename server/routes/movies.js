const express = require("express");
const router = express.Router();
const movieController = require("../controllers/movieController");

router.get("/search", movieController.searchMovies);
router.get("/discover", movieController.discoverMovies);
router.get("/suggestions", movieController.getMovieSuggestions);
router.get("/trending", movieController.getTrendingMovies);
router.get("/top-rated", movieController.getTopRatedMovies);

// Rotta Admin per aggiornamento
router.get("/admin/update-all-data", movieController.updateAllMoviesData);

// --- NUOVA ROTTA PERSONA ---
// IMPORTANTE: Deve stare PRIMA di /:tmdbId altrimenti Express pensa che "person" sia un ID
router.get("/person/:name", movieController.getMoviesByPerson);

router.get("/:tmdbId", movieController.getMovieDetails);

module.exports = router;