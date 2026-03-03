const express = require("express");
const router = express.Router();
const triviaController = require("../controllers/triviaController");
const auth = require("../middleware/authMiddleware");

router.get("/questions", auth, triviaController.getTriviaQuestions);

module.exports = router;
