const mongoose = require("mongoose");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });
const OmdbCache = require("/Users/jurgen126q/Desktop/skibidi/server/models/OmdbCache");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const cache = await OmdbCache.findOne({ tmdb_id: 110 });
  console.log("CACHE 110:", cache);
  
  process.exit();
}
run();
