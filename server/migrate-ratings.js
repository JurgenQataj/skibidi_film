const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config({ path: "./.env" });

const BASE_URL = "https://api.themoviedb.org/3";
const API_KEY = process.env.TMDB_API_KEY;

if (!API_KEY) {
  console.error("Missing TMDB_API_KEY");
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const Movie = require("./models/Movie");
    // Cerchiamo tutti i film in modo da aggiornare il loro voto TMDB
    const movies = await Movie.find({});
    
    console.log(`Found ${movies.length} movies to update with TMDB rating...`);
    
    let updatedCount = 0;
    for (let movie of movies) {
      try {
        const numericId = Number(movie.tmdb_id);
        const isTv = movie.media_type === "tv";
        const tmdbUrl = isTv
          ? `${BASE_URL}/tv/${numericId}?api_key=${API_KEY}`
          : `${BASE_URL}/movie/${numericId}?api_key=${API_KEY}`;
          
        const res = await axios.get(tmdbUrl);
        const rating = res.data.vote_average;
        
        movie.vote_average = rating;
        await movie.save();
        updatedCount++;
        console.log(`[${updatedCount}/${movies.length}] Updated ${movie.title} with rating ${rating}`);
        
        // Anti-rate limit
        await new Promise(r => setTimeout(r, 50));
      } catch (err) {
        console.error(`Failed to update movie ${movie.title} (${movie.tmdb_id}):`, err.message);
      }
    }
    
    console.log(`Migration completed. Updated ${updatedCount} movies.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
