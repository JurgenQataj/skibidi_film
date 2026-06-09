const mongoose = require("mongoose");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });
const OmdbCache = require("/Users/jurgen126q/Desktop/skibidi/server/models/OmdbCache");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Find caches that don't have imdb_rating (meaning they probably failed with "Movie not found!" due to Italian title)
  const res = await OmdbCache.deleteMany({ imdb_rating: null });
  console.log(`Deleted ${res.deletedCount} empty OmdbCache entries.`);
  
  process.exit();
}
run();
