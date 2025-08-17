const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

// Auth
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// User Discovery
router.get("/most-followed", userController.getMostFollowedUsers);
router.get("/newest", userController.getNewestUsers);

// Profile
router.get("/:userId/profile", userController.getUserProfile);
router.put("/profile", authMiddleware, userController.updateUserProfile);
router.get("/:userId/stats", userController.getUserStats);

router.delete("/profile", authMiddleware, userController.deleteUserProfile);
router.get("/:userId/stats", userController.getUserStats);

// Social
router.post("/:userId/follow", authMiddleware, userController.followUser);
router.delete("/:userId/unfollow", authMiddleware, userController.unfollowUser);
router.get(
  "/:userId/follow-status",
  authMiddleware,
  userController.getFollowStatus
);
router.get("/:userId/followers", userController.getFollowers);
router.get("/:userId/following", userController.getFollowing);

// Content
router.get("/feed", authMiddleware, userController.getUserFeed);
router.get("/:userId/reviews", userController.getUserReviews);
router.get("/:userId/lists", userController.getUserLists);

module.exports = router;
