const mongoose = require("mongoose");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });
const OmdbCache = require("/Users/jurgen126q/Desktop/skibidi/server/models/OmdbCache");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const res = await OmdbCache.deleteMany({ imdb_rating: null });
  console.log(`Deleted ${res.deletedCount} empty entries.`);
  process.exit();
}
run();
