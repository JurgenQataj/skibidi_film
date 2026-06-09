const mongoose = require("mongoose");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });
const User = require("/Users/jurgen126q/Desktop/skibidi/server/models/User");
const Movie = require("/Users/jurgen126q/Desktop/skibidi/server/models/Movie");
const OmdbCache = require("/Users/jurgen126q/Desktop/skibidi/server/models/OmdbCache");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const user = await User.findOne().populate("watchlist");
  if (!user) return console.log("No user found");
  
  const watchlist = user.watchlist;
  console.log(`Watchlist has ${watchlist.length} movies`);
  
  for (let i = 0; i < Math.min(20, watchlist.length); i++) {
    const movie = watchlist[i];
    const cache = await OmdbCache.findOne({ tmdb_id: movie.tmdb_id, media_type: movie.media_type });
    console.log(`[${movie.media_type.toUpperCase()}] ${movie.title} (TMDB: ${movie.tmdb_id})`);
    if (cache) {
      console.log(`   -> Cached: IMDb: ${cache.imdb_rating}, Rotten: ${cache.rotten_tomatoes}, Meta: ${cache.metascore}`);
    } else {
      console.log(`   -> NOT CACHED`);
    }
  }
  
  process.exit();
}
run();
