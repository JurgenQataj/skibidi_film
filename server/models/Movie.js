const mongoose = require("mongoose");

const MovieSchema = new mongoose.Schema({
  tmdb_id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  poster_path: { type: String },
  release_year: { type: Number },
  // Nuovi campi per le statistiche
  director: { type: String }, 
  cast: [{ type: String }], // Array di nomi degli attori
  genres: [{ type: String }], // [NEW] Array di generi (es. "Action", "Comedy")
  collection_info: {
    id: Number,
    name: String,
    poster_path: String,
    backdrop_path: String
  }
});

module.exports = mongoose.model("Movie", MovieSchema);