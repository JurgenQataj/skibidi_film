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
    const movies = await Movie.find({
      $or: [
        { release_year: { $exists: false } },
        { release_year: null }
      ]
    });
    
    console.log(`Found ${movies.length} movies to update...`);
    
    let updatedCount = 0;
    for (let movie of movies) {
      try {
        const numericId = Number(movie.tmdb_id);
        const isTv = movie.media_type === "tv";
        const tmdbUrl = isTv
          ? `${BASE_URL}/tv/${numericId}?api_key=${API_KEY}`
          : `${BASE_URL}/movie/${numericId}?api_key=${API_KEY}`;
          
        const res = await axios.get(tmdbUrl);
        const dateStr = isTv ? res.data.first_air_date : res.data.release_date;
        const year = dateStr ? new Date(dateStr).getFullYear() : null;
        
        if (year) {
          movie.release_year = year;
          await movie.save();
          updatedCount++;
          console.log(`[${updatedCount}/${movies.length}] Updated ${movie.title} with year ${year}`);
        } else {
          console.log(`No date for ${movie.title}`);
        }
        
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
