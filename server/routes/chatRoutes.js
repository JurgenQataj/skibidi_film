const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware"); // Protezione API

// Rotte per la chat globale
router.get("/", chatController.getMessages);
router.post("/", protect, chatController.postMessage);

module.exports = router;
