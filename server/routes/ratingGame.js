const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto"); // Node built-in CSPRNG — replaces Math.random()
const { protect } = require("../middleware/authMiddleware");
const RatingGameScore = require("../models/RatingGameScore");
const User = require("../models/User");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

const TOTAL_PAGES = 100;

async function getRandomMovie(excludeId = null) {
  // crypto.randomInt(min, max) is a CSPRNG (OS entropy pool) — replaces Math.random()
  const randomPage = crypto.randomInt(1, TOTAL_PAGES + 1);
  const res = await axios.get(`${TMDB_BASE}/movie/popular`, {
    params: { api_key: TMDB_API_KEY, language: "it-IT", page: randomPage },
  });
  let movies = res.data.results.filter(
    (m) => m.vote_count >= 1000 && m.id !== excludeId && m.poster_path
  );
  if (movies.length === 0) {
    const fallbackPage = crypto.randomInt(1, 51);
    const fallback = await axios.get(`${TMDB_BASE}/movie/popular`, {
      params: { api_key: TMDB_API_KEY, language: "it-IT", page: fallbackPage },
    });
    movies = fallback.data.results.filter(
      (m) => m.vote_count >= 1000 && m.id !== excludeId && m.poster_path
    );
  }
  if (movies.length === 0) throw new Error("No valid movies found");
  return movies[crypto.randomInt(0, movies.length)];
}

// GET /api/rating-game/pair?mode=rating|boxoffice&exclude=id1,id2
router.get("/pair", async (req, res) => {
  try {
    const excludeIds = req.query.exclude
      ? req.query.exclude.split(",").map(Number)
      : [];

    let movieA = await getRandomMovie();
    let attempts = 0;
    while (excludeIds.includes(movieA.id) && attempts < 10) {
      movieA = await getRandomMovie();
      attempts++;
    }

    let movieB = await getRandomMovie(movieA.id);
    attempts = 0;
    while (
      (excludeIds.includes(movieB.id) || movieB.id === movieA.id) &&
      attempts < 10
    ) {
      movieB = await getRandomMovie(movieA.id);
      attempts++;
    }

    if (req.query.mode === "boxoffice") {
      const [detailA, detailB] = await Promise.all([
        axios.get(`${TMDB_BASE}/movie/${movieA.id}`, {
          params: { api_key: TMDB_API_KEY, language: "it-IT" },
        }),
        axios.get(`${TMDB_BASE}/movie/${movieB.id}`, {
          params: { api_key: TMDB_API_KEY, language: "it-IT" },
        }),
      ]);
      movieA = { ...movieA, revenue: detailA.data.revenue || 0 };
      movieB = { ...movieB, revenue: detailB.data.revenue || 0 };
    }

    res.json({ movieA, movieB });
  } catch (err) {
    console.error("Rating game error:", err.message);
    res.status(500).json({ error: "Failed to fetch movies" });
  }
});

// POST /api/rating-game/score — submit/update personal best (protected)
router.post("/score", protect, async (req, res) => {
  try {
    const { mode, score } = req.body;
    if (!["rating", "boxoffice"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }
    // Only update if new score is higher
    const existing = await RatingGameScore.findOne({
      user: req.user.id,
      mode: String(mode),
    });
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        await existing.save();
      }
      return res.json(existing);
    }
    const newScore = await RatingGameScore.create({
      user: req.user.id,
      mode: String(mode),
      score: Number(score),
    });
    res.json(newScore);
  } catch (err) {
    console.error("Score submit error:", err.message);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// GET /api/rating-game/leaderboard?mode=rating|boxoffice — top 20
router.get("/leaderboard", async (req, res) => {
  try {
    const { mode } = req.query;
    if (!["rating", "boxoffice"].includes(mode)) {
      return res.status(400).json({ error: "Invalid mode" });
    }
    const scores = await RatingGameScore.find({ mode: String(mode) })
      .sort({ score: -1 })
      .limit(20)
      .populate("user", "username avatar_url");

    res.json(scores);
  } catch (err) {
    console.error("Leaderboard error:", err.message);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

// GET /api/rating-game/my-scores — personal scores for all modes (protected)
router.get("/my-scores", protect, async (req, res) => {
  try {
    const scores = await RatingGameScore.find({ user: req.user.id });
    const result = { rating: 0, boxoffice: 0 };
    scores.forEach((s) => {
      result[s.mode] = s.score;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch scores" });
  }
});

module.exports = router;
