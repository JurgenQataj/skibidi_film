const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    avatar_url: { type: String },
    bio: { type: String },

    // Riferimenti agli altri modelli
    watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Movie" }],
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // Le liste verranno gestite tramite il modello MovieList
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
