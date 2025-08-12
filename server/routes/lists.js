const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', authMiddleware, listController.createList);
router.get('/:listId', listController.getListDetails);
router.delete('/:listId', authMiddleware, listController.deleteList);
router.post('/:listId/movies', authMiddleware, listController.addMovieToList);
router.delete('/:listId/movies/:tmdbId', authMiddleware, listController.removeMovieFromList);

module.exports = router;