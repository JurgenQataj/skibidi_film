const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");
const Movie = require("../models/Movie");

// Load env variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("❌ ERRORE: TMDB_API_KEY non trovata nel file .env");
  process.exit(1);
}

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connesso a MongoDB");
  } catch (err) {
    console.error("❌ Errore connessione MongoDB:", err.message);
    process.exit(1);
  }
};

const backfillGenres = async () => {
  await connectDB();

  try {
    // Troviamo i film che NON hanno il campo genres o ce l'hanno vuoto
    const moviesToUpdate = await Movie.find({
      $or: [
        { genres: { $exists: false } },
        { genres: { $size: 0 } }
      ]
    });

    console.log(`🎬 Trovati ${moviesToUpdate.length} film da aggiornare...`);

    for (let i = 0; i < moviesToUpdate.length; i++) {
      const movie = moviesToUpdate[i];
      console.log(`[${i + 1}/${moviesToUpdate.length}] Aggiorno: ${movie.title} (ID: ${movie.tmdb_id})...`);

      try {
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}&language=it-IT`;
        const response = await axios.get(tmdbUrl);
        const genres = response.data.genres.map(g => g.name);

        if (genres.length > 0) {
          movie.genres = genres;
          await movie.save();
          console.log(`   ✅ Generi salvati: ${genres.join(", ")}`);
        } else {
          console.log(`   ⚠️ Nessun genere trovato su TMDB.`);
        }
      } catch (err) {
        console.error(`   ❌ Errore aggiornamento ${movie.title}:`, err.message);
      }

      // Evitiamo di spammare le API (piccola pausa)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log("✨ Backfill completato!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Errore script:", err);
    process.exit(1);
  }
};

backfillGenres();
