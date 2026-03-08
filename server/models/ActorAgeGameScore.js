const mongoose = require("mongoose");

const actorAgeGameScoreSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      score: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

actorAgeGameScoreSchema.index({ user: 1 }, { unique: true });

module.exports = mongoose.model("ActorAgeGameScore", actorAgeGameScoreSchema);
