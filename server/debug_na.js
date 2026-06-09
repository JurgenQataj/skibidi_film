const mongoose = require("mongoose");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });
const OmdbCache = require("/Users/jurgen126q/Desktop/skibidi/server/models/OmdbCache");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const allCache = await OmdbCache.find({});
  const missingRotten = allCache.filter(c => !c.rotten_tomatoes);
  
  console.log(`Total cache entries: ${allCache.length}`);
  console.log(`Entries missing Rotten Tomatoes: ${missingRotten.length}`);
  
  if (missingRotten.length > 0) {
    console.log("Sample missing Rotten:");
    missingRotten.slice(0, 5).forEach(c => {
      console.log(`TMDB ID: ${c.tmdb_id}, MediaType: ${c.media_type}, IMDb Rating: ${c.imdb_rating}`);
    });
  }
  
  process.exit();
}
run();
