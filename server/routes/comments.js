const express = require("express");
// mergeParams: true è la chiave per far funzionare le rotte annidate
const router = express.Router({ mergeParams: true });
const commentController = require("../controllers/commentController");
const authMiddleware = require("../middleware/authMiddleware");

// Corrisponde a: POST /api/reviews/:reviewId/comments
router.post("/", authMiddleware, commentController.addComment);

// Corrisponde a: GET /api/reviews/:reviewId/comments
router.get("/", commentController.getComments);

// Corrisponde a: DELETE /api/reviews/:reviewId/comments/:commentId
router.delete("/:commentId", authMiddleware, commentController.deleteComment);

module.exports = router;
