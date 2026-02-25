require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Movie = require("./models/Movie");

const API_KEY = process.env.TMDB_API_KEY;

async function backfillMovies() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB.");

  // Trova i film salvati (mediaType != "tv" e runtime is missing)
  const movies = await Movie.find({ 
    media_type: { $ne: "tv" },
    runtime: { $exists: false } 
  });

  console.log(`Trovati ${movies.length} film da aggiornare.`);

  let count = 0;
  for (const doc of movies) {
    try {
      const resp = await axios.get(`https://api.themoviedb.org/3/movie/${doc.tmdb_id}?api_key=${API_KEY}&language=it-IT`);
      const data = resp.data;

      const runtime = data.runtime || 0;
      const countries = data.production_countries?.map(c => c.name) || [];

      doc.runtime = runtime;
      doc.production_countries = countries;
      await doc.save();
      
      count++;
      if (count % 50 === 0) console.log(`Aggiornati ${count} film...`);

      // Rate limit safety
      await new Promise(r => setTimeout(r, 60)); // max ~16 req/sec
    } catch (e) {
      if (e.response && e.response.status === 404) {
        // Film rimosso da TMDB
        doc.runtime = 0;
        doc.production_countries = [];
        await doc.save();
      } else {
        console.error(`Errore TMDB su movie ${doc.tmdb_id}: ${e.message}`);
      }
    }
  }

  console.log("Fine aggiornamento.");
  process.exit(0);
}

backfillMovies();
