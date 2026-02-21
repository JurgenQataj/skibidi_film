const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database");

connectDB();

const app = express();

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
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/lists", require("./routes/lists"));
app.use("/api/watchlist", require("./routes/watchlist"));
app.use("/api/comments", require("./routes/comments"));
app.use("/api/reactions", require("./routes/reactions"));
app.use("/api/notifications", require("./routes/notifications"));

app.get("/", (req, res) => res.send("Skibidi Film API Running"));

// --- MODIFICA PER RENDER: Avvia il server e ascolta su una porta ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
});
