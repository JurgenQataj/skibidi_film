const mongoose = require("mongoose");

const OmdbCacheSchema = new mongoose.Schema({
  tmdb_id: { type: Number, required: true },
  media_type: { type: String, enum: ['movie', 'tv'], default: 'movie' },
  imdb_rating: { type: String }, // es. "8.8"
  imdb_votes: { type: String },
  rotten_tomatoes: { type: String }, // es. "87%"
  metascore: { type: String },
  updated_at: { type: Date, default: Date.now }
});

// Indice composto per ricerche veloci ed evitare duplicati
OmdbCacheSchema.index({ tmdb_id: 1, media_type: 1 }, { unique: true });

module.exports = mongoose.model("OmdbCache", OmdbCacheSchema);
