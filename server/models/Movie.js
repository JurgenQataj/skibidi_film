const mongoose = require("mongoose");

const MovieSchema = new mongoose.Schema({
  tmdb_id: { type: Number, required: true },
  media_type: { type: String, enum: ['movie', 'tv'], default: 'movie' },
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

MovieSchema.index({ tmdb_id: 1, media_type: 1 }, { unique: true });

module.exports = mongoose.model("Movie", MovieSchema);