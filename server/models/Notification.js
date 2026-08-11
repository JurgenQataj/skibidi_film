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
      enum: ["new_follower", "new_reaction", "new_comment", "chat_mention", "comment_mention", "review_mention", "thread_comment", "following_review", "comment_like"],
      required: true,
    },
    targetReview: { type: mongoose.Schema.Types.ObjectId, ref: "Review" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Indici composti per query ad alte prestazioni
NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);
