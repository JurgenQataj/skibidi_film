const express = require("express");
const router = express.Router();
const tvController = require("../controllers/tvController");

router.get("/search", tvController.searchTv);
router.get("/discover", tvController.discoverTv);
router.get("/trending", tvController.getTrendingTv);
router.get("/:tmdbId", tvController.getTvDetails);

module.exports = router;
