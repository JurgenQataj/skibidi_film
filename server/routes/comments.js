const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

// URL: GET /api/comments/review/:reviewId
router.get("/review/:reviewId", commentController.getComments);

// URL: POST /api/comments/review/:reviewId
router.post("/review/:reviewId", authMiddleware, commentController.addComment);

// URL: DELETE /api/comments/review/:reviewId/comment/:commentId
router.delete(
  "/review/:reviewId/comment/:commentId",
  authMiddleware,
  commentController.deleteComment
);

module.exports = router;
