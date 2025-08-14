const express = require("express");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/database"); // Importa la nuova funzione di connessione

// Esegui la connessione a MongoDB Atlas
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rotte
app.use("/api/users", require("./routes/users"));
app.use("/api/movies", require("./routes/movies"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/api/lists", require("./routes/lists"));
app.use("/api/reactions", require("./routes/reactions"));
app.use("/api/watchlist", require("./routes/watchlist"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/comments", require("./routes/comments"));

// Rotta di prova
app.get("/", (req, res) => {
  res.send("<h1>Il server di Skibidi Film (MongoDB) è attivo! 🎉</h1>");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
});
