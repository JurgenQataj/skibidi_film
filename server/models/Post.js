const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
