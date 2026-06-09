require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');
const axios = require('axios');

async function fixRuntimes() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB.");

    const movies = await Movie.find({ 
      $or: [
        { runtime: { $exists: false } },
        { runtime: null }
      ]
    });

    console.log(`Found ${movies.length} movies missing runtime.`);

    let count = 0;
    for (const movie of movies) {
      try {
        const tmdbUrl = movie.media_type === "tv"
          ? `https://api.themoviedb.org/3/tv/${movie.tmdb_id}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`
          : `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${process.env.TMDB_API_KEY}&language=it-IT`;
        
        const response = await axios.get(tmdbUrl);
        const data = response.data;
        
        let runtime = 0;
        if (movie.media_type === "tv") {
          runtime = (data.episode_run_time && data.episode_run_time.length > 0) ? data.episode_run_time[0] : 0;
        } else {
          runtime = data.runtime || 0;
        }

        movie.runtime = runtime;
        
        // Also fix genres and release_year if missing
        if (!movie.genres || movie.genres.length === 0) {
           movie.genres = data.genres?.map(g => g.name) || [];
        }
        if (!movie.release_year) {
           const dateStr = movie.media_type === "tv" ? data.first_air_date : data.release_date;
           movie.release_year = dateStr ? new Date(dateStr).getFullYear() : null;
        }
        if (movie.vote_average === undefined || movie.vote_average === null) {
           movie.vote_average = data.vote_average;
        }

        await movie.save();
        count++;
        if (count % 10 === 0) {
           console.log(`Updated ${count}/${movies.length}...`);
        }
        
        // Rate limiting: sleep for 50ms
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.error(`Failed to fetch runtime for ${movie.title} (${movie.tmdb_id}):`, e.message);
      }
    }

    console.log(`Finished updating ${count} movies.`);
    process.exit(0);
  } catch (error) {
    console.error("Error connecting to DB:", error);
    process.exit(1);
  }
}

fixRuntimes();
