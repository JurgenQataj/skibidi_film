const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database");

connectDB();

const app = express();
// Disable X-Powered-By header — prevents Express version disclosure (Sonar S5699)
app.disable("x-powered-by");

// Warn early if TMDB_API_KEY is missing
if (!process.env.TMDB_API_KEY) {
  console.error("❌ CRITICAL: TMDB_API_KEY is not set in environment variables! All TMDB API calls will fail.");
} else {
  console.log("✅ TMDB_API_KEY is configured.");
}

// --- CONFIGURAZIONE CORS UNIVERSALE PER SVILUPPO ---
const corsOptions = {
  origin: function (origin, callback) {
    // !origin -> Permette richieste server-to-server (es. Postman) o app mobili
    // includes("localhost") -> Permette localhost su QUALSIASI porta (5173, 5174, 5175...)
    // includes("192.168.") -> Permette l'accesso dalla rete Wi-Fi locale (es. dal cellulare)
    // endsWith(".vercel.app") -> Permette il frontend in produzione
    if (
      !origin ||
      origin.includes("localhost") ||
      origin.includes("192.168.") || 
      origin.endsWith(".vercel.app") ||
      origin.endsWith(".loca.lt")
    ) {
      callback(null, true);
    } else {
      console.log("BLOCCATO DA CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());

// ... (tutto uguale sotto) ...

// --- ROTTE (invariate) ---
app.use("/api/users", require("./routes/users"));
app.use("/api/movies", require("./routes/movies"));
app.use("/api/tv", require("./routes/tv")); // [NEW] TV Routes
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/lists", require("./routes/lists"));
app.use("/api/watchlist", require("./routes/watchlist"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/reactions", require("./routes/reactions"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/chat", require("./routes/chatRoutes")); // [NEW] Chat Routes
app.use("/api/posts", require("./routes/posts")); // [NEW] Admin Posts
app.use("/api/rating-game", require("./routes/ratingGame")); // [NEW] Rating Game
app.use("/api/actor-age-game", require("./routes/actorAgeGame")); // [NEW] Indovina il Vecchio
app.use("/api/guess-actor", require("./routes/guessActor")); // [NEW] Chi è? Indovina Attore
app.use("/api/guess-year", require("./routes/guessYearGame")); // [NEW] Quale Anno?
app.use("/api/push", require("./routes/push")); // [NEW] VAPID Push Subscriptions
app.use("/api/news", require("./routes/news")); // [NEW] Cinema & TV News

app.get("/", (req, res) => res.send("Skibidi Film API Running"));

// Health check endpoint to diagnose configuration issues
app.get("/api/health", async (req, res) => {
  const axios = require("axios");
  const tmdbKey = process.env.TMDB_API_KEY;
  let tmdbStatus = "❌ NOT SET";
  let tmdbTest = null;
  if (tmdbKey) {
    try {
      const r = await axios.get(`https://api.themoviedb.org/3/movie/550?api_key=${tmdbKey}`);
      tmdbStatus = `✅ OK (${r.status})`;
      tmdbTest = r.data.title;
    } catch(e) {
      tmdbStatus = `❌ FAILED: ${e.message}`;
    }
  }
  res.json({
    status: "running",
    tmdb_api_key: tmdbKey ? "SET" : "MISSING",
    tmdb_connectivity: tmdbStatus,
    tmdb_test_movie: tmdbTest,
    node_env: process.env.NODE_ENV || "not set"
  });
});

// --- MODIFICA PER RENDER: Avvia il server e ascolta su una porta ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
});
