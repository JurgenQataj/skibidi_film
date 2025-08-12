const express = require("express");
const router = express.Router(); // <-- QUESTA RIGA FONDAMENTALE MANCAVA O ERA NEL POSTO SBAGLIATO
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/register", userController.registerUser);

router.post("/login", userController.loginUser);

router.get("/feed", authMiddleware, userController.getUserFeed);

router.post("/:userId/follow", authMiddleware, userController.followUser);
router.delete("/:userId/unfollow", authMiddleware, userController.unfollowUser);
router.get("/:userId/reviews", userController.getUserReviews);
router.get("/:userId/lists", userController.getUserLists);
router.get("/:userId/profile", userController.getUserProfile); // Pubblica
router.get("/:userId/stats", userController.getUserStats);
router.get("/:userId/debug", userController.getDebugInfo);
router.get(
  "/:userId/follow-status",
  authMiddleware,
  userController.getFollowStatus
);
router.put("/profile", authMiddleware, userController.updateUserProfile);
router.get("/most-followed", userController.getMostFollowedUsers);
router.get("/newest", userController.getNewestUsers);
router.get("/:userId/followers", userController.getFollowers);
router.get("/:userId/following", userController.getFollowing);

module.exports = router;
