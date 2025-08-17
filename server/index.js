const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database");

connectDB(); // Esegue la connessione a MongoDB

const app = express();

const whitelist = ["http://localhost:5173", "https://skibidi-film.vercel.app"]; // Aggiungi qui l'URL del tuo Vercel
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
};
app.use(cors(corsOptions));
app.use(express.json());

// Rotte
app.use("/api/users", require("./routes/users"));
app.use("/api/movies", require("./routes/movies"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/lists", require("./routes/lists"));
app.use("/api/watchlist", require("./routes/watchlist"));
app.use("/api/reviews/:reviewId/comments", require("./routes/comments"));
app.use("/api/reactions", require("./routes/reactions"));
app.use("/api/notifications", require("./routes/notifications"));

app.get("/", (req, res) => res.send("Skibidi Film API Running"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server in ascolto sulla porta ${PORT}`));
