const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
const connectDB = require("./config/database");

connectDB();

const app = express();

// --- SICUREZZA BASE ---
// Imposta header HTTP per la sicurezza
app.use(helmet({
  // Permette il caricamento cross-origin per il proxy delle immagini
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// --- RATE LIMITING ---
// Rate limiter globale (previene DDoS su tutte le API)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 1000, // 1000 richieste per IP in 15 minuti
  message: { error: "Troppe richieste dal tuo IP, riprova più tardi." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Rate limiter per proxy immagini (protegge banda server e ban da TMDB)
const imgProxyLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300, // 300 immagini al minuto per IP
  message: { error: "Troppe richieste di immagini. Rallenta." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Disable X-Powered-By header — prevents Express version disclosure (Sonar S5699)
app.disable("x-powered-by");

// Warn early if TMDB_API_KEY is missing
if (!process.env.TMDB_API_KEY) {
  console.error("❌ CRITICAL: TMDB_API_KEY is not set in environment variables! All TMDB API calls will fail.");
} else {
  console.log("✅ TMDB_API_KEY is configured.");
}

// --- CONFIGURAZIONE CORS ---
const allowedProductionOrigins = [
  process.env.CLIENT_URL, // Dominio ufficiale da variabili d'ambiente
  "https://skibidifilm.vercel.app", // Inserisci qui il tuo dominio di produzione esatto
  "https://skibidi-film.vercel.app"
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (process.env.NODE_ENV !== "production") {
      // In sviluppo: Permette localhost, reti locali, Vercel preview e loca.lt
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.includes("192.168.") || 
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".loca.lt")
      ) {
        return callback(null, true);
      }
    } else {
      // In produzione: Permette solo il dominio ufficiale (o richieste server-to-server)
      if (!origin || allowedProductionOrigins.includes(origin)) {
        return callback(null, true);
      }
    }
    
    console.log("BLOCCATO DA CORS:", origin);
    callback(new Error("Not allowed by CORS"));
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

// --- PROXY IMMAGINI TMDB (Risolve CORS in produzione per fast-average-color) ---
app.get("/api/tmdb-img/:size/:file", imgProxyLimiter, async (req, res) => {
  const axios = require("axios");
  const { size, file } = req.params;
  try {
    const tmdbUrl = `https://image.tmdb.org/t/p/${size}/${file}`;
    const response = await axios({
      url: tmdbUrl,
      method: "GET",
      responseType: "stream"
    });
    
    // Pass headers
    res.set("Content-Type", response.headers["content-type"]);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    
    // Stream response directly to client
    response.data.pipe(res);
  } catch (error) {
    console.error("Errore nel proxy immagine TMDB:", error.message);
    res.status(500).json({ error: "Failed to fetch image" });
  }
});

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
