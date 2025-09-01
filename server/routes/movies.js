const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

router.get('/trending', movieController.getTrendingMovies); // Accetta ?time_window=day|week
router.get('/popular', movieController.getPopularMovies);
router.get('/most-reviewed', movieController.getMostReviewedMovies);
router.get('/top-rated', movieController.getTopRatedMovies);
router.get('/genres', movieController.getGenres);
router.get('/genre/:genreId', movieController.getMoviesByGenre);
router.get('/search', movieController.searchMovies);
router.get('/:tmdbId', movieController.getMovieDetails); // Deve essere l'ultima per evitare conflitti

module.exports = router;