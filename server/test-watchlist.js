const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });
const User = require("./models/User");
const Movie = require("./models/Movie");
const { enrichWithOmdbRatings } = require("./services/omdbService");

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    try {
      const user = await User.findById("689e32aafd9753a8e4652182").populate("watchlist");
      if (!user) throw new Error("Utente non trovato");
      
      console.log("Watchlist DB caricata. Tentativo di enrichWithOmdbRatings...");
      const enrichedWatchlist = await enrichWithOmdbRatings(user.watchlist || []);
      console.log("Enrich completato! Primo film:", enrichedWatchlist[0]?.title);
      process.exit(0);
    } catch (error) {
      console.error("ERRORE DURANTE LA SIMULAZIONE:", error);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
