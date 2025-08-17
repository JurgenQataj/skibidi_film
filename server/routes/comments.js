const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

// Aggiungere un commento
router.post("/reviews/:reviewId", authMiddleware, commentController.addComment);

// Ottenere i commenti
router.get("/reviews/:reviewId", commentController.getComments);

// --- NUOVA ROTTA: Eliminare un commento ---
router.delete(
  "/:commentId/reviews/:reviewId",
  authMiddleware,
  commentController.deleteComment
);

module.exports = router;
