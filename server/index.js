const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database");

connectDB();

const app = express();

// --- CONFIGURAZIONE CORS MIGLIORATA PER VERCEL ---
const whitelist = [
  "http://localhost:5173",
  "http://192.168.1.6:5173",
  "https://skibidi-film.vercel.app",
];
const corsOptions = {
  origin: function (origin, callback) {
    // Permette le richieste da URL di preview di Vercel e dalla whitelist
    if (
      !origin ||
      whitelist.indexOf(origin) !== -1 ||
      origin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));
app.use(express.json());

// --- ROTTE (invariate) ---
app.use("/api/users", require("./routes/users"));
app.use("/api/movies", require("./routes/movies"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/lists", require("./routes/lists"));
app.use("/api/watchlist", require("./routes/watchlist"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/reactions", require("./routes/reactions"));
app.use("/api/notifications", require("./routes/notifications"));

app.get("/", (req, res) => res.send("Skibidi Film API Running"));

// --- MODIFICA CHIAVE: ESPORTA L'APP PER VERCEL ---
// Rimuoviamo completamente la parte con app.listen()
// e la sostituiamo con questa riga.
module.exports = app;
