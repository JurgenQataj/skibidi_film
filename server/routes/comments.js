const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
// MODIFICA QUI: Importiamo 'protect' con le parentesi graffe
const { protect } = require("../middleware/authMiddleware");

// URL: GET /api/comments/review/:reviewId
router.get("/review/:reviewId", commentController.getComments);

// URL: POST /api/comments/review/:reviewId
// MODIFICA QUI: Usiamo 'protect'
router.post("/review/:reviewId", protect, commentController.addComment);

// URL: DELETE /api/comments/review/:reviewId/comment/:commentId
router.delete(
  "/review/:reviewId/comment/:commentId",
  protect, // MODIFICA QUI: Usiamo 'protect'
  commentController.deleteComment
);

module.exports = router;