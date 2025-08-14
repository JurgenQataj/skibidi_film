const mongoose = require("mongoose");
const NotificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["new_follower", "new_reaction", "new_comment"],
      required: true,
    },
    targetReview: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
module.exports = mongoose.model("Notification", NotificationSchema);
