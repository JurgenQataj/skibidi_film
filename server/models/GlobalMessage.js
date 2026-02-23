const mongoose = require("mongoose");

const globalMessageSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: true,
    maxlength: 500,
  }
}, { timestamps: true });

module.exports = mongoose.model("GlobalMessage", globalMessageSchema);
