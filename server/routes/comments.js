const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

// Aggiungere un commento
router.post("/:reviewId", authMiddleware, commentController.addComment);

// Ottenere i commenti
router.get("/:reviewId", commentController.getComments);

// --- NUOVA ROTTA CORRETTA: Eliminare un commento ---
router.delete(
  "/:reviewId/:commentId",
  authMiddleware,
  commentController.deleteComment
);

module.exports = router;
