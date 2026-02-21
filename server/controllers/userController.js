const User = require("../models/User");
const Review = require("../models/Review");
const MovieList = require("../models/MovieList");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const SibApiV3Sdk = require("sib-api-v3-sdk");

// Configurazione Brevo (una volta sola a livello di file)
const defaultClient = SibApiV3Sdk.ApiClient.instance;
// Se non hai impostato la chiave, evita il crash ma le email non partiranno
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY || ""; 
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

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

    if (username.length > 10) {
      return res.status(400).json({ message: "Il nome utente non può superare i 10 caratteri." });
    }

    const userExists = await User.findOne({ $or: [{ username }, { email }] });
    if (userExists) return res.status(409).json({ message: "Username o Email già in uso." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    const token = jwt.sign(
      { user: { id: user.id, username: user.username } },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

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

    const token = jwt.sign(
      { user: { id: user.id, username: user.username } },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// --- RECUPERO PASSWORD CON BREVO (via sib-api-v3-sdk) ---

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  console.log(`[DEBUG] Richiesta Password Dimenticata per: ${email}`);

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`[DEBUG] Utente non trovato.`);
      return res.status(404).json({ message: "Email non trovata." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 ora
    await user.save();

    console.log(`[DEBUG] Token salvato. Invio email con Brevo (sib-api-v3-sdk)...`);

    const frontendUrl =
      process.env.NODE_ENV === "production"
        ? "https://skibidi-film.vercel.app"
        : "http://localhost:5173";

    const resetUrl = `${frontendUrl}/reset-password/${token}`;

    console.log(`[DEBUG] Tento invio a ${user.email}...`);

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    // Usa la tua email Brevo verificata come sender o una generica se configurata
    sendSmtpEmail.sender = {
      email: "jurgenklopp144@gmail.com", 
      name: "Skibidi Film",
    };
    sendSmtpEmail.to = [{ email: user.email }];
    sendSmtpEmail.subject = "Reset Password Skibidi Film";
    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Reset Password</h2>
        <p>Hai richiesto il reset della password per il tuo account Skibidi Film.</p>
        <p>Clicca sul pulsante qui sotto per reimpostare la password:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
        <p>Oppure copia questo link nel browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">Questo link scade tra 1 ora. Se non hai richiesto il reset, ignora questa email.</p>
      </div>
    `;

    const result = await emailApi.sendTransacEmail(sendSmtpEmail);

    console.log(`✅ [DEBUG] EMAIL INVIATA! RISPOSTA: ${JSON.stringify(result)}`);
    res.json({ message: "Email di recupero inviata!" });
  } catch (error) {
    console.error("🔥 [DEBUG] ERRORE BREVO:", error);
    console.error("🔥 [DEBUG] DETTAGLI:", error?.response?.text || error.message);
    res.status(500).json({ message: "Errore invio email." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
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
    const { bio, avatar_url, email, username } = req.body;
    
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (emailExists) return res.status(400).json({ message: "Email già in uso." });
    }

    if (username) {
      if (username.length > 10) {
        return res.status(400).json({ message: "Il nome utente non può superare i 10 caratteri." });
      }
      const usernameExists = await User.findOne({ username, _id: { $ne: req.user.id } });
      if (usernameExists) return res.status(400).json({ message: "Username già in uso." });
    }

    const updateData = { bio, avatar_url };
    if (email) updateData.email = email;
    if (username) updateData.username = username;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password");
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
    await Notification.deleteMany({
      $or: [{ recipient: userId }, { sender: userId }],
    });
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

// --- NUOVA FUNZIONE: STATISTICHE AVANZATE DINAMICHE (Con Anno) ---
exports.getUserAdvancedStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    // Leggiamo l'anno dalla query string, altrimenti usiamo l'anno corrente
    const targetYear = parseInt(req.query.year) || new Date().getFullYear();
    const limit = parseInt(req.query.limit) || 30; // [NEW] Limit per le classifiche (default 30)

    const user = await User.findById(userId).select("username");
    if (!user) return res.status(404).json({ message: "Utente non trovato" });

    // Otteniamo tutte le recensioni popolate con i dati del film
    const reviews = await Review.find({ user: userId }).populate("movie");

    // Filtra recensioni valide (dove il film esiste ancora)
    const validReviews = reviews.filter(r => r.movie);

    // 1. Top 10 Film dell'anno specifico (voto più alto)
    const topYear = validReviews
      .filter(r => r.movie.release_year === targetYear)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    // 2. Top 10 Film All Time (voto più alto)
    const topAllTime = [...validReviews]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    // Helper per contare occorrenze
    const countOccurrences = (items) => {
      const counts = {};
      items.forEach(item => {
        if (item) counts[item] = (counts[item] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1]) // Ordina per conteggio decrescente
        .slice(0, limit) // [MOD] Usa il limit dinamico invece di 10 fisso
        .map(([name, count]) => ({ name, count }));
    };

    // 3. Top 10 Attori più visti
    let allActors = [];
    validReviews.forEach(r => {
      if (r.movie.cast && Array.isArray(r.movie.cast)) {
        allActors = allActors.concat(r.movie.cast);
      }
    });
    const topActors = countOccurrences(allActors);

    // 4. Top 10 Registi più visti
    let allDirectors = [];
    validReviews.forEach(r => {
      if (r.movie.director) {
        allDirectors.push(r.movie.director);
      }
    });
    const topDirectors = countOccurrences(allDirectors);

    // 5 & 6. Statistiche Generi Unificate (Visti e Voto)
    const genreStats = {}; 

    validReviews.forEach(r => {
      if (r.movie && r.movie.genres && Array.isArray(r.movie.genres)) {
        r.movie.genres.forEach(genre => {
          // Normalizzazione robusta
          let genreName = "";
          if (typeof genre === 'string') genreName = genre;
          else if (genre && typeof genre === 'object' && genre.name) genreName = genre.name;
          
          genreName = String(genreName).trim();
          if (!genreName) return;

          if (!genreStats[genreName]) {
            genreStats[genreName] = { count: 0, sum: 0 };
          }
          
          genreStats[genreName].count += 1;
          
          const ratingVal = Number(r.rating);
          if (!isNaN(ratingVal)) {
            genreStats[genreName].sum += ratingVal;
          }
        });
      }
    });

    const allGenresData = Object.entries(genreStats).map(([name, data]) => ({
      name,
      count: data.count,
      avg: data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0
    }));

    // Top Generi più visti (include avg per display)
    const topGenres = [...allGenresData]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    // Top Generi per Voto (include count per display)
    const topGenresByRating = [...allGenresData]
      .filter(g => g.count >= 1) 
      .sort((a, b) => b.avg - a.avg)
      .slice(0, limit);

    res.json({
      username: user.username,
      topYear,     // Restituiamo la lista dell'anno selezionato
      targetYear,  // Restituiamo l'anno per conferma
      topAllTime,
      topActors,
      topDirectors,
      topGenres,
      topGenresByRating // [NEW]
    });


  } catch (error) {
    console.error("Errore Advanced Stats:", error);
    res.status(500).json({ message: "Errore server" });
  }
};

// --- SOCIAL E FOLLOW ---

exports.followUser = async (req, res) => {
  if (req.params.userId === req.user.id)
    return res.status(400).json({ message: "Non puoi seguirti da solo." });
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { following: req.params.userId },
    });
    await User.findByIdAndUpdate(req.params.userId, {
      $addToSet: { followers: req.user.id },
    });

    await Notification.create({
      recipient: req.params.userId,
      sender: req.user.id,
      type: "new_follower",
    });
    res.json({ message: "Seguito!" });
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
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
    res.json({ message: "Non segui più." });
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
  }
};

exports.getFollowStatus = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser)
      return res.status(404).json({ message: "Utente non trovato" });

    const following = currentUser.following || [];
    res.json({ isFollowing: following.includes(req.params.userId) });
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "followers",
      "_id username avatar_url"
    );
    if (!user) return res.status(404).json({ message: "Utente non trovato" });
    res.json(user.followers || []);
  } catch (error) {
    console.error("Errore getFollowers:", error);
    res.status(500).json({ message: "Errore server" });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "following",
      "_id username avatar_url"
    );
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
    if (!currentUser)
      return res.status(404).json({ message: "Utente non trovato." });

    const following = currentUser.following || [];

    const reviews = await Review.find({ user: { $in: following } })
      .populate("user", "username avatar_url")
      .populate("movie", "title poster_path tmdb_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const validReviews = reviews.filter((r) => r.user && r.movie);

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

    res.json(reviews.filter((r) => r.movie));
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
  }
};

exports.getUserLists = async (req, res) => {
  try {
    const lists = await MovieList.find({ user: req.params.userId }).sort({
      createdAt: -1,
    });

    const watchlistPseudoList = {
      _id: "watchlist",
      title: "Watchlist",
      description: "I film che vuoi vedere",
      movieCount: 0,
    };

    res.json([watchlistPseudoList, ...lists]);
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
  }
};

// --- DISCOVERY ---

exports.getMostFollowedUsers = async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $project: {
          _id: 1,
          username: 1,
          avatar_url: 1,
          followers_count: {
            $size: { $ifNull: ["$followers", []] },
          },
        },
      },
      { $sort: { followers_count: -1 } },
      { $limit: 20 },
    ]);
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore server" });
  }
};

exports.getNewestUsers = async (req, res) => {
  try {
    const users = await User.find()
      .sort({ createdAt: -1 })
      .limit(20)
      .select("_id username avatar_url");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
  }
};

// --- COLLEZIONI PARZIALI INTELLIGENTI ---
exports.getPartialCollections = async (req, res) => {
  const { userId } = req.params;
  const axios = require('axios');
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const Movie = require('../models/Movie');

  try {
    const reviews = await Review.find({ user: userId }).populate('movie');
    const validReviews = reviews.filter(r => r.movie);

    // --- STEP 1: Self-healing PARALLELO ---
    // Trova tutti i film senza collection_info e recupera da TMDB in parallelo
    const moviesNeedingSync = validReviews
      .map(r => r.movie)
      .filter(movie => {
        const ci = movie.collection_info;
        if (!ci) return true;
        const ciObj = movie.toObject().collection_info || {};
        return Object.keys(ciObj).length === 0 || ci.id === undefined;
      });

    if (moviesNeedingSync.length > 0) {
      await Promise.allSettled(
        moviesNeedingSync.map(async (movie) => {
          try {
            const r = await axios.get(
              `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}&language=it-IT`,
              { timeout: 8000 }
            );
            const coll = r.data.belongs_to_collection;
            movie.collection_info = coll
              ? { id: coll.id, name: coll.name, poster_path: coll.poster_path, backdrop_path: coll.backdrop_path }
              : { id: -1 }; // sentinella: nessuna saga, non ritentare
            await movie.save();
          } catch (err) {
            console.error(`[PARTIAL] self-heal film ${movie.tmdb_id}:`, err.message);
          }
        })
      );
    }

    // --- STEP 2: Raggruppa film per saga ---
    const collectionMap = new Map();
    for (const r of validReviews) {
      const movie = r.movie;
      const ci = movie.collection_info;
      if (ci && ci.id && ci.id > 0) {
        if (!collectionMap.has(ci.id)) {
          collectionMap.set(ci.id, {
            id: ci.id,
            name: ci.name,
            poster_path: ci.poster_path,
            backdrop_path: ci.backdrop_path,
            reviewedTmdbIds: new Set()
          });
        }
        collectionMap.get(ci.id).reviewedTmdbIds.add(Number(movie.tmdb_id));
      }
    }

    // --- STEP 3: Valida ogni saga su TMDB in PARALLELO (live = sempre aggiornato) ---
    // Questo è il cuore: controlla quanti film usciti ha la saga e quanti ne ha visti l'utente
    const today = new Date();
    const partials = [];

    await Promise.allSettled(
      Array.from(collectionMap.values()).map(async (coll) => {
        try {
          const r = await axios.get(
            `https://api.themoviedb.org/3/collection/${coll.id}?api_key=${TMDB_API_KEY}&language=it-IT`,
            { timeout: 8000 }
          );
          // Solo i film già usciti contano (future-proof: nuovi film si aggiungono da soli)
          const releasedParts = (r.data.parts || []).filter(
            p => p.release_date && new Date(p.release_date) <= today
          );
          const total = releasedParts.length;
          if (total < 2) return; // saghe con 1 solo film non contano

          const seen = releasedParts.filter(p => coll.reviewedTmdbIds.has(Number(p.id))).length;

          if (seen > 0 && seen < total) {
            // Saga incompleta: l'utente ha visto almeno 1 ma non tutti
            partials.push({
              id: coll.id,
              name: coll.name,
              poster_path: coll.poster_path,
              backdrop_path: coll.backdrop_path,
              seen,
              total,
              missing: total - seen
            });
          }
          // Se seen === total → saga COMPLETA, non va nelle parziali
        } catch (err) {
          console.error(`[PARTIAL] errore saga ${coll.id}:`, err.message);
        }
      })
    );

    // Ordina: chi manca meno è più vicina al completamento
    partials.sort((a, b) => a.missing - b.missing);
    res.json(partials);

  } catch (error) {
    console.error('Errore getPartialCollections:', error);
    res.status(500).json({ message: 'Errore del server nel recupero saghe.' });
  }
};



// --- HELPER: SINCRONIZZAZIONE COLLEZIONI (chiamato su ogni add/delete recensione) ---
exports.syncUserCollections = async (userId) => {
  const axios = require('axios');
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const Movie = require('../models/Movie');

  try {
    const reviews = await Review.find({ user: userId }).populate('movie');
    const user = await User.findById(userId);
    if (!user) return;

    const validMovies = reviews.map(r => r.movie).filter(Boolean);

    // --- Self-healing PARALLELO: recupera collection_info per film senza ---
    const needsSync = validMovies.filter(movie => {
      const ci = movie.collection_info;
      if (!ci) return true;
      const ciObj = movie.toObject().collection_info || {};
      return Object.keys(ciObj).length === 0 || ci.id === undefined;
    });

    if (needsSync.length > 0) {
      await Promise.allSettled(
        needsSync.map(async (movie) => {
          try {
            const r = await axios.get(
              `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}&language=it-IT`,
              { timeout: 8000 }
            );
            const coll = r.data.belongs_to_collection;
            movie.collection_info = coll
              ? { id: coll.id, name: coll.name, poster_path: coll.poster_path, backdrop_path: coll.backdrop_path }
              : { id: -1 };
            await movie.save();
          } catch (err) {
            console.error(`[SYNC] self-heal film ${movie.tmdb_id}:`, err.message);
          }
        })
      );
    }

    // --- Raggruppa per saga ---
    const collectionMap = new Map();
    for (const movie of validMovies) {
      const ci = movie.collection_info;
      if (ci && ci.id && ci.id > 0) {
        if (!collectionMap.has(ci.id)) {
          collectionMap.set(ci.id, {
            id: ci.id,
            name: ci.name,
            poster_path: ci.poster_path,
            reviewedTmdbIds: new Set()
          });
        }
        collectionMap.get(ci.id).reviewedTmdbIds.add(Number(movie.tmdb_id));
      }
    }

    // --- Verifica saghe completate in PARALLELO su TMDB ---
    const completed = [];
    const today = new Date();
    await Promise.allSettled(
      Array.from(collectionMap.values()).map(async (coll) => {
        try {
          const r = await axios.get(
            `https://api.themoviedb.org/3/collection/${coll.id}?api_key=${TMDB_API_KEY}&language=it-IT`,
            { timeout: 8000 }
          );
          const released = (r.data.parts || []).filter(
            p => p.release_date && new Date(p.release_date) <= today
          );
          if (released.length < 2) return;
          const seen = released.filter(p => coll.reviewedTmdbIds.has(Number(p.id))).length;
          if (seen === released.length) {
            completed.push({ id: coll.id, name: coll.name, poster_path: coll.poster_path });
          }
        } catch (err) {
          console.error(`[SYNC] errore saga ${coll.id}:`, err.message);
        }
      })
    );

    // --- Aggiorna le saghe completate sul profilo utente ---
    await User.updateOne({ _id: user._id }, { $set: { completedCollections: completed } });
    console.log(`[SYNC] ${user.username}: ${completed.length} saghe complete`);
  } catch (error) {
    console.error('[SYNC] Errore syncUserCollections:', error);
  }
};