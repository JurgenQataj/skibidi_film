const mongoose = require("mongoose");

const MovieListSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    description: { type: String },
    movies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MovieList", MovieListSchema);
