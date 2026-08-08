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
  savedPeople: [{
    id: Number,
    name: String,
    profile_path: String
  }],

  // Trofei/Badge saghe
  completedCollections: [{ 
    id: Number, 
    name: String, 
    poster_path: String 
  }],

  // Saghe incomplete (aggiornate da syncUserCollections)
  partialCollections: [{
    id: Number,
    name: String,
    poster_path: String,
    backdrop_path: String,
    seen: Number,
    total: Number,
    missing: Number
  }],

  // Preferenze Notifiche Push (granulari)
  notification_preferences: {
    push_enabled:   { type: Boolean, default: true },  // Master switch
    comments:       { type: Boolean, default: true },  // Commenti sulle tue recensioni
    reactions:      { type: Boolean, default: true },  // Reazioni alle tue recensioni
    followers:      { type: Boolean, default: true },  // Nuovi follower
    mentions:       { type: Boolean, default: true },  // @menzioni in commenti e chat
    thread_replies: { type: Boolean, default: true },  // Risposte in thread a cui partecipi
  },

  // Recupero Password
  resetPasswordToken: String,
  resetPasswordExpires: Date
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);