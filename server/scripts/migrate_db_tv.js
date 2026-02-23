require("dotenv").config();
const mongoose = require("mongoose");
const Movie = require("../models/Movie");

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to DB.");

    try {
      await Movie.collection.dropIndex("tmdb_id_1");
      console.log("Dropped old tmdb_id_1 index.");
    } catch (e) {
      console.log("Old index not found or already dropped:", e.message);
    }
    
    await Movie.ensureIndexes();
    console.log("Created new compound index.");
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

run();
