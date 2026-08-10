const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movie: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true,
    },
    rating: { type: Number, required: true, min: 0, max: 10 },
    comment_text: { type: String },
    is_spoiler: { type: Boolean, default: false },
    season_number: { type: Number, default: null },
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        reaction_type: { type: String },
      },
    ],
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        comment_text: { type: String }, // Corretto da 'text' a 'comment_text'
        createdAt: { type: Date, default: Date.now },
        likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      },
    ],
  },
  { timestamps: true }
);

// Indice composto per il check duplicati (user + movie + season_number)
ReviewSchema.index({ user: 1, movie: 1, season_number: 1 }, { unique: true });
// Indice per le query per film e stagione
ReviewSchema.index({ movie: 1, season_number: 1 });

module.exports = mongoose.model("Review", ReviewSchema);
