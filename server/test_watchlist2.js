const mongoose = require("mongoose");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });
const OmdbCache = require("/Users/jurgen126q/Desktop/skibidi/server/models/OmdbCache");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  // Dump some OmdbCache entries with rotten_tomatoes
  const cache = await OmdbCache.find({ rotten_tomatoes: { $ne: null } }).limit(5);
  console.log("ROTTEN:");
  console.log(cache.map(c => c.rotten_tomatoes));

  const cacheImdb = await OmdbCache.find({ imdb_rating: { $ne: null } }).limit(5);
  console.log("IMDB:");
  console.log(cacheImdb.map(c => c.imdb_rating));

  const cacheMeta = await OmdbCache.find({ metascore: { $ne: null } }).limit(5);
  console.log("META:");
  console.log(cacheMeta.map(c => c.metascore));
  
  process.exit();
}
run();
