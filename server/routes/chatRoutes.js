const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

// Rotte per la chat globale
router.get("/", chatController.getMessages);
router.post("/", protect, chatController.postMessage);
router.post("/:id/like", protect, chatController.likeMessage);
router.delete("/:id", protect, chatController.deleteMessage);

module.exports = router;
