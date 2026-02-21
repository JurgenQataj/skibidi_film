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
    const { bio, avatar_url, email } = req.body;
    
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (emailExists) return res.status(400).json({ message: "Email già in uso." });
    }

    const updateData = { bio, avatar_url };
    if (email) updateData.email = email;

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

  try {
    const reviews = await Review.find({ user: userId }).populate('movie');
    const collectionMap = new Map(); // cid -> { name, poster_path, reviewedMovies: Set }

    // Raccoglie ids recensiti
    for (const r of reviews) {
      const movie = r.movie;
      if (movie && movie.collection_info && movie.collection_info.id) {
        const cid = movie.collection_info.id;
        if (!collectionMap.has(cid)) {
          collectionMap.set(cid, {
            id: cid,
            name: movie.collection_info.name,
            poster_path: movie.collection_info.poster_path,
            backdrop_path: movie.collection_info.backdrop_path,
            reviewedMovies: new Set()
          });
        }
        collectionMap.get(cid).reviewedMovies.add(movie.tmdb_id);
      }
    }

    const partials = [];

    // Validazione Asincrona Parallela su TMDB per futuro proofing
    const promises = Array.from(collectionMap.values()).map(async (collData) => {
      try {
        const response = await axios.get(`https://api.themoviedb.org/3/collection/${collData.id}?api_key=${TMDB_API_KEY}&language=it-IT`);
        // Filtriamo le pellicole già uscite o in uscita entro oggi
        const parts = response.data.parts.filter(p => p.release_date && new Date(p.release_date) <= new Date());
        const totalRequired = parts.length;

        let foundCount = 0;
        for (const p of parts) {
          if (collData.reviewedMovies.has(p.id)) foundCount++;
        }

        // Se l'utente ne ha visto almeno 1 ma MENO del totale richiesto, è Parziale
        if (foundCount > 0 && foundCount < totalRequired && totalRequired > 1) {
          partials.push({
            id: collData.id,
            name: collData.name,
            poster_path: collData.poster_path,
            backdrop_path: collData.backdrop_path,
            seen: foundCount,
            total: totalRequired,
            missing: totalRequired - foundCount
          });
        }
      } catch (err) {
        // Ignora gentilmente errori di singola saga
        console.error(`Errore TMDB su Saga ID ${collData.id}:`, err.message);
      }
    });

    await Promise.all(promises);

    // Ordiniamo per quante mancano, chi ne mancano meno in cima
    partials.sort((a, b) => a.missing - b.missing);

    res.json(partials);
  } catch (error) {
    console.error("Errore recupero saghe parziali:", error);
    res.status(500).json({ message: "Errore locale durante il fetch saghe parziali." });
  }
};