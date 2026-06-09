const mongoose = require("mongoose");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });
const User = require("/Users/jurgen126q/Desktop/skibidi/server/models/User");
const Movie = require("/Users/jurgen126q/Desktop/skibidi/server/models/Movie");
const OmdbCache = require("/Users/jurgen126q/Desktop/skibidi/server/models/OmdbCache");
const { enrichWithOmdbRatings } = require("/Users/jurgen126q/Desktop/skibidi/server/services/omdbService");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Just dump one movie from watchlist that has OmdbCache
  const cache = await OmdbCache.find({}).limit(10);
  console.log(cache);
  
  process.exit();
}
run();
