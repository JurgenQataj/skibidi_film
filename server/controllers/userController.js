const User = require("../models/User");
const Review = require("../models/Review");
const MovieList = require("../models/MovieList");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

// --- FUNZIONI DI AUTENTICAZIONE ---

exports.registerUser = async (req, res) => {
  const { username, email, password, inviteCode } = req.body;
  
  if (process.env.REGISTRATION_SECRET_CODE && inviteCode !== process.env.REGISTRATION_SECRET_CODE) {
    return res.status(403).json({ message: "Codice d'invito non valido." });
  }

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ message: "Compila tutti i campi." });
    }

    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) return res.status(409).json({ message: "Username o Email già in uso." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign({ user: { id: user.id, username: user.username } }, process.env.JWT_SECRET, { expiresIn: "30d" });

    res.status(201).json({ message: "Registrazione avvenuta!", token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ $or: [{ username }, { email: username }] });
    if (!user) return res.status(401).json({ message: "Credenziali non valide." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Credenziali non valide." });

    const token = jwt.sign({ user: { id: user.id, username: user.username } }, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// --- RECUPERO PASSWORD (CONFIGURAZIONE PORTA 587) ---

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Email non trovata." });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 ora
    await user.save();

    // --- NUOVA CONFIGURAZIONE PER EVITARE TIMEOUT ---
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,            // Usiamo la porta 587 (Standard per TLS)
      secure: false,        // false per la 587 (true è solo per la 465)
      auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
      },
      tls: {
        rejectUnauthorized: false // Aiuta a bypassare problemi di certificati su Render
      }
    });

    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://skibidi-film.vercel.app' 
      : 'http://localhost:5173';

    const resetUrl = `${frontendUrl}/reset-password/${token}`;
    
    await transporter.sendMail({
      to: user.email,
      from: `"Skibidi Support" <${process.env.EMAIL_USER}>`, // Mittente più carino
      subject: 'Reset Password Skibidi Film',
      text: `Hai richiesto il reset della password.\n\nClicca qui per procedere: ${resetUrl}\n\nIl link scade in 1 ora.`
    });

    res.json({ message: "Email di recupero inviata!" });
  } catch (error) {
    console.error("Errore invio email:", error);
    res.status(500).json({ message: "Errore invio email (Timeout o Credenziali)." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ message: "Token scaduto o non valido." });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password aggiornata!" });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// --- PROFILO UTENTE ---

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "Utente non trovato." });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "ID utente non valido." });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    const { bio, avatar_url, email } = req.body;
    
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (emailExists) return res.status(400).json({ message: "Email già in uso." });
    }

    const updateData = { bio, avatar_url };
    if (email) updateData.email = email;

    const user = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Errore aggiornamento profilo." });
  }
};

exports.deleteUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    await MovieList.deleteMany({ user: userId });
    await Review.deleteMany({ user: userId });
    await Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] });
    await User.updateMany({ followers: userId }, { $pull: { followers: userId } });
    await User.updateMany({ following: userId }, { $pull: { following: userId } });
    
    await User.findByIdAndDelete(userId);
    res.json({ message: "Account eliminato." });
  } catch (error) {
    res.status(500).json({ message: "Errore eliminazione account." });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    const moviesReviewed = await Review.countDocuments({ user: userId });
    
    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    res.json({
      username: user.username,
      moviesReviewed,
      followersCount,
      followingCount,
    });
  } catch (error) {
    console.error("Errore Stats:", error);
    res.status(500).json({ message: "Errore server" });
  }
};

// --- SOCIAL E FOLLOW ---

exports.followUser = async (req, res) => {
  if (req.params.userId === req.user.id) return res.status(400).json({ message: "Non puoi seguirti da solo." });
  try {
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { following: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { $addToSet: { followers: req.user.id } });
    
    await Notification.create({ recipient: req.params.userId, sender: req.user.id, type: "new_follower" });
    res.json({ message: "Seguito!" });
  } catch (error) { res.status(500).json({ message: "Errore server" }); }
};

exports.unfollowUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $pull: { following: req.params.userId } });
    await User.findByIdAndUpdate(req.params.userId, { $pull: { followers: req.user.id } });
    res.json({ message: "Non segui più." });
  } catch (error) { res.status(500).json({ message: "Errore server" }); }
};

exports.getFollowStatus = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "Utente non trovato" });
    
    const following = currentUser.following || [];
    res.json({ isFollowing: following.includes(req.params.userId) });
  } catch (error) { res.status(500).json({ message: "Errore server" }); }
};

exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("followers", "_id username avatar_url");
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    res.json(user.followers || []);
  } catch (error) {
    console.error("Errore getFollowers:", error);
    res.status(500).json({ message: "Errore server" }); 
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("following", "_id username avatar_url");
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    res.json(user.following || []);
  } catch (error) {
    console.error("Errore getFollowing:", error);
    res.status(500).json({ message: "Errore server" }); 
  }
};

// --- CONTENUTI UTENTE ---

exports.getUserFeed = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) return res.status(404).json({ message: "Utente non trovato." });

    const following = currentUser.following || [];
    
    const reviews = await Review.find({ user: { $in: following } })
      .populate("user", "username avatar_url")
      .populate("movie", "title poster_path tmdb_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const validReviews = reviews.filter(r => r.user && r.movie);
    
    res.json(validReviews);
  } catch (error) {
    console.error("Errore Feed:", error);
    res.status(500).json({ message: "Errore server." });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.userId })
      .populate("movie", "tmdb_id title poster_path")
      .sort({ createdAt: -1 });
    
    res.json(reviews.filter(r => r.movie));
  } catch (error) { res.status(500).json({ message: "Errore server" }); }
};

exports.getUserLists = async (req, res) => {
  try {
    const lists = await MovieList.find({ user: req.params.userId }).sort({ createdAt: -1 });
    
    const watchlistPseudoList = {
      _id: "watchlist", 
      title: "Watchlist",
      description: "I film che vuoi vedere",
      movieCount: 0 
    };

    res.json([watchlistPseudoList, ...lists]);
  } catch (error) { res.status(500).json({ message: "Errore server" }); }
};

// --- DISCOVERY ---

exports.getMostFollowedUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      { $project: { _id: 1, username: 1, avatar_url: 1, followers_count: { $size: { $ifNull: ["$followers", []] } } } },
      { $sort: { followers_count: -1 } },
      { $limit: 20 }
    ]);
    res.json(users);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ message: "Errore server" }); 
  }
};

exports.getNewestUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(20).select("_id username avatar_url");
    res.json(users);
  } catch (error) { res.status(500).json({ message: "Errore server" }); }
};