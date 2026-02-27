const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: "Film da guardare"
  },
  targetFrequency: {
    type: Number,
    required: true,
    min: 1
  },
  year: {
    type: Number,
    required: true,
    default: new Date().getFullYear()
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Goal', goalSchema);
