const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movieController');

router.get('/trending', movieController.getTrendingMovies);
router.get('/top-rated', movieController.getTopRatedMovies);
router.get('/search', movieController.searchMovies);
router.get('/:tmdbId', movieController.getMovieDetails);

module.exports = router;