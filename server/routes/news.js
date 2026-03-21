const express = require("express");
const router = express.Router();
const axios = require("axios");

const NEWS_API_KEY = process.env.NEWS_API_KEY;

const NEWS_QUERY =
  'film OR cinema OR "serie TV" OR "serie tv" OR movie OR "box office" OR Oscar OR Netflix OR "Disney+" OR "Amazon Prime Video" OR HBO OR "Prime Video" OR "Apple TV+" OR Cannes OR "Venezia Film Festival" OR "Golden Globe" OR BAFTA OR trailer OR sequel OR blockbuster';

const ENTERTAINMENT_DOMAINS = [
  "variety.com",
  "hollywoodreporter.com",
  "deadline.com",
  "rottentomatoes.com",
  "indiewire.com",
  "screenrant.com",
  "ign.com",
  "empireonline.com",
  "collider.com",
  "slashfilm.com",
  "cinemablend.com",
  "thewrap.com",
  "moviefone.com",
  "fandango.com",
  "comingsoon.net",
  "mymovies.it",
  "cinematographe.it",
  "badtaste.it",
  "comingsoon.it",
  "movieplayer.it",
].join(",");

/**
 * GET /api/news?page=1&pageSize=12
 * Proxy verso NewsAPI — la chiave rimane sicura sul server.
 */
router.get("/", async (req, res) => {
  if (!NEWS_API_KEY) {
    return res.status(503).json({ error: "NEWS_API_KEY non configurata sul server." });
  }

  const page = parseInt(req.query.page) || 1;
  const pageSize = Math.min(parseInt(req.query.pageSize) || 12, 20);

  try {
    const response = await axios.get("https://newsapi.org/v2/everything", {
      params: {
        q: NEWS_QUERY,
        domains: ENTERTAINMENT_DOMAINS,
        sortBy: "publishedAt",
        pageSize,
        page,
        apiKey: NEWS_API_KEY,
      },
      timeout: 8000,
    });

    const data = response.data;

    // Filtra articoli senza titolo o rimossi
    const articles = (data.articles || []).filter(
      (a) => a.title && a.title !== "[Removed]" && a.url
    );

    res.json({
      status: "ok",
      totalResults: data.totalResults,
      articles,
    });
  } catch (err) {
    const status = err.response?.status || 500;
    const message = err.response?.data?.message || err.message;
    console.error("News API error:", message);
    res.status(status).json({ error: message });
  }
});

module.exports = router;
