const User = require("../models/User");
const Review = require("../models/Review");
const MovieList = require("../models/MovieList");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// --- Funzioni di Autenticazione ---
exports.registerUser = async (req, res) => {
  const { username, password, inviteCode } = req.body;
  if (inviteCode !== process.env.REGISTRATION_SECRET_CODE) {
    return res.status(403).json({ message: "Codice d'invito non valido." });
  }
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(409).json({ message: "Username già preso." });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: `Utente '${username}' registrato!` });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user)
      return res.status(401).json({ message: "Credenziali non valide." });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Credenziali non valide." });
    const payload = { user: { id: user.id, username: user.username } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// --- Funzioni del Profilo ---
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
    const { bio, avatar_url } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { bio, avatar_url },
      { new: true }
    ).select("-password");
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// --- Funzioni Social ---
exports.followUser = async (req, res) => {
  try {
    if (req.params.userId === req.user.id)
      return res.status(400).json({ message: "Non puoi seguire te stesso." });
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { following: req.params.userId },
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $addToSet: { followers: req.user.id },
    });
    const notification = new Notification({
      recipient: req.params.userId,
      sender: req.user.id,
      type: "new_follower",
    });
    await notification.save();
    res.json({ message: "Utente seguito" });
  } catch (error) {
    res.status(500).json({ message: "Errore del server" });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { following: req.params.userId },
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { followers: req.user.id },
    });
    res.json({ message: "Non segui più l'utente" });
  } catch (error) {
    res.status(500).json({ message: "Errore del server" });
  }
};

exports.getFollowStatus = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    res.json({
      isFollowing: currentUser.following.includes(req.params.userId),
    });
  } catch (error) {
    res.status(500).json({ message: "Errore del server" });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "followers",
      "_id username avatar_url"
    );
    res.json(user.followers);
  } catch (error) {
    res.status(500).json({ message: "Errore del server" });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "following",
      "_id username avatar_url"
    );
    res.json(user.following);
  } catch (error) {
    res.status(500).json({ message: "Errore del server" });
  }
};

// --- Funzioni di Contenuto ---
exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: req.params.userId })
      .populate({ path: "movie", select: "tmdb_id title poster_path" })
      .sort({ createdAt: "desc" });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.getUserLists = async (req, res) => {
  try {
    const lists = await MovieList.find({ user: req.params.userId }).sort({
      createdAt: "desc",
    });
    const watchlistPseudoList = {
      id: "watchlist",
      title: "Watchlist",
      description: "Film da vedere",
    };
    res.json([watchlistPseudoList, ...lists]);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.getUserFeed = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  try {
    // 1. Trova l'utente corrente e la lista di chi segue.
    const currentUser = await User.findById(req.user.id);
    const followingIds = currentUser.following;

    // 2. Se non segue nessuno, restituisci un feed vuoto.
    if (!followingIds || followingIds.length === 0) {
      return res.json([]);
    }

    // 3. Cerca le recensioni degli utenti seguiti.
    const reviews = await Review.find({ user: { $in: followingIds } })
      .populate({
        path: "user",
        select: "username avatar_url _id",
      })
      .populate({
        path: "movie",
        select: "title poster_path tmdb_id",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // 4. Filtro di sicurezza finale per scartare dati corrotti (recensioni "orfane")
    const validReviews = reviews.filter(
      (review) => review.user && review.movie
    );

    // 5. Invia i dati "grezzi" e completi, senza formattazioni rischiose.
    // 5. Formatta le recensioni per garantire la coerenza con altre parti dell'API
    const formattedReviews = validReviews.map((review) => ({
      ...review.toObject(),
      id: review._id,
    }));

    res.json(formattedReviews);
  } catch (error) {
    console.error("Errore critico nel caricamento del feed:", error);
    res
      .status(500)
      .json({ message: "Errore del server durante il caricamento del feed." });
  }
};

// --- Funzioni di Scoperta e Statistiche ---
exports.getMostFollowedUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $project: {
          _id: 1,
          username: 1,
          avatar_url: 1,
          followers_count: { $size: "$followers" },
        },
      },
      { $sort: { followers_count: -1 } },
      { $limit: 20 },
    ]);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Errore del server" });
  }
};

exports.getNewestUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("_id username avatar_url createdAt");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Errore del server" });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utente non trovato." });
    const moviesReviewed = await Review.countDocuments({ user: userId });
    res.json({
      username: user.username,
      moviesReviewed,
      followersCount: user.followers.length,
      followingCount: user.following.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
