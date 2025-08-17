const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
const authMiddleware = require("../middleware/authMiddleware");
const commentsRouter = require("./comments"); // Importiamo il router dei commenti

// Quando una richiesta arriva a /:reviewId/comments, usa il router dei commenti
router.use("/:reviewId/comments", commentsRouter);

// Rotte esistenti per le recensioni
router.post("/", authMiddleware, reviewController.addReview);
router.get("/movie/:tmdbId", reviewController.getReviewsForMovie);
router.get(
  "/status/:tmdbId",
  authMiddleware,
  reviewController.checkUserReviewStatus
);
router.delete("/:reviewId", authMiddleware, reviewController.deleteReview);

module.exports = router;
