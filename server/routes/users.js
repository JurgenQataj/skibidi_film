const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// --- Auth ---
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password/:token", userController.resetPassword);

// --- Social & Discovery ---
router.get("/version", (req, res) => res.json({ version: "1.2.5", timestamp: new Date() }));
router.get("/most-followed", userController.getMostFollowedUsers);
router.get("/newest", userController.getNewestUsers);

// --- Content ---
router.get("/feed", protect, userController.getUserFeed); 

// --- Profile ---
router.get("/:userId/profile", userController.getUserProfile);
router.put("/profile", protect, userController.updateUserProfile);
router.delete("/profile", protect, userController.deleteUserProfile);
router.get("/:userId/stats", userController.getUserStats);
// Nuova rotta per statistiche avanzate
router.get("/:userId/advanced-stats", userController.getUserAdvancedStats);

// --- Follow System ---
router.post("/:userId/follow", protect, userController.followUser);
router.delete("/:userId/unfollow", protect, userController.unfollowUser);
router.get("/:userId/follow-status", protect, userController.getFollowStatus);
router.get("/:userId/followers", userController.getFollowers);
router.get("/:userId/following", userController.getFollowing);

// --- Altre rotte specifiche ---
router.get("/:userId/partial-collections", protect, userController.getPartialCollections);
router.get("/:userId/reviews", userController.getUserReviews);
router.get("/:userId/lists", userController.getUserLists);

module.exports = router;