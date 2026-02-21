const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // Profilo
  avatar_url: { type: String, default: "" }, 
  bio: { type: String, default: "" },

  // Social & Contenuti
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  // Liste
  watchlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Movie' }],
  lists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'MovieList' }],

  // Trofei/Badge
  completedCollections: [{ 
    id: Number, 
    name: String, 
    poster_path: String 
  }],

  // Recupero Password
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);