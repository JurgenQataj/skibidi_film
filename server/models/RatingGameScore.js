const mongoose = require("mongoose");

const ratingGameScoreSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    mode: { type: String, enum: ["rating", "boxoffice"], required: true },
    score: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

// One document per user per mode, upsert on submit
ratingGameScoreSchema.index({ user: 1, mode: 1 }, { unique: true });

module.exports = mongoose.model("RatingGameScore", ratingGameScoreSchema);
