const express = require('express');
const router = express.Router();
const listController = require('../controllers/listController');
// MODIFICA QUI: Importiamo 'protect' con le parentesi graffe
const { protect } = require('../middleware/authMiddleware');

// MODIFICA QUI: Usiamo 'protect' in tutte le rotte protette
router.post('/', protect, listController.createList);
router.get('/:listId', listController.getListDetails); // Questa è pubblica, ok senza protect
router.delete('/:listId', protect, listController.deleteList);
router.post('/:listId/movies', protect, listController.addMovieToList);
router.delete('/:listId/movies/:tmdbId', protect, listController.removeMovieFromList);

module.exports = router;