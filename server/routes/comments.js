const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

// Aggiungere un commento a una recensione
// Corrisponde a: POST /api/reviews/:reviewId/comments
// highlight-next-line
router.post(
  "/:reviewId/comments",
  authMiddleware,
  commentController.addComment
);

// Ottenere i commenti di una recensione
// Corrisponde a: GET /api/reviews/:reviewId/comments
// highlight-next-line
router.get("/:reviewId/comments", commentController.getComments);

// Eliminare un commento
// Corrisponde a: DELETE /api/reviews/:reviewId/comments/:commentId
// highlight-next-line
router.delete(
  "/:reviewId/comments/:commentId",
  authMiddleware,
  commentController.deleteComment
);

module.exports = router;
