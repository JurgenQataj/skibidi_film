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
// DEVE stare PRIMA di /:tmdbId altrimenti "person" viene letto come un ID film
router.get("/person/:name", movieController.getMoviesByPerson);

// Rotta dettaglio film (deve essere l'ultima get con un parametro variabile)
router.get("/:tmdbId", movieController.getMovieDetails);

module.exports = router;