const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/reviewController");
// Importiamo la funzione 'protect' usando le parentesi graffe
const { protect } = require("../middleware/authMiddleware"); 

// Rotte per le recensioni
// Usiamo 'protect' direttamente
router.post("/", protect, reviewController.addReview);
router.get("/movie/:tmdbId", reviewController.getReviewsForMovie);
router.get(
  "/status/:tmdbId",
  protect, // Usiamo 'protect' direttamente
  reviewController.checkUserReviewStatus
);
router.delete("/:reviewId", protect, reviewController.deleteReview); // Usiamo 'protect' direttamente
router.put("/:reviewId", protect, reviewController.updateReview); // [NEW] Modifica recensione

module.exports = router;