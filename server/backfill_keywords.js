require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Movie = require("./models/Movie");

const API_KEY = process.env.TMDB_API_KEY;

async function backfillKeywords() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const movies = await Movie.find({ keywords: { $exists: false } });
    console.log(`Trovati ${movies.length} film da aggiornare con parole chiave.`);

    let count = 0;
    for (const doc of movies) {
      try {
        const endpoint = doc.media_type === "tv"
          ? `https://api.themoviedb.org/3/tv/${doc.tmdb_id}/keywords?api_key=${API_KEY}`
          : `https://api.themoviedb.org/3/movie/${doc.tmdb_id}/keywords?api_key=${API_KEY}`;
        
        const resp = await axios.get(endpoint);
        const data = resp.data;
        
        let keywords = [];
        if (doc.media_type === "tv") {
           keywords = data.results?.map(k => k.name) || [];
        } else {
           keywords = data.keywords?.map(k => k.name) || [];
        }

        doc.keywords = keywords;
        await doc.save();
        count++;
        if (count % 30 === 0) console.log(`Aggiornati ${count} film...`);
        // Rate limiting avoid
        await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        if (e.response && e.response.status === 404) {
          doc.keywords = [];
          await doc.save();
        } else {
          console.error(`Errore su tmdb_id ${doc.tmdb_id}: ${e.message}`);
        }
      }
    }
    console.log(`Fine aggiornamento parole chiave (totale: ${count}).`);
    process.exit(0);
  } catch (error) {
    console.error("Errore connessione DB:", error);
    process.exit(1);
  }
}

backfillKeywords();
