const User = require("../models/User");
const Review = require("../models/Review");
const MovieList = require("../models/MovieList");
const Notification = require("../models/Notification");
const Post = require("../models/Post");
const Goal = require("../models/Goal");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const axios = require("axios");
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

  try {
    const user = await User.findOne({ email: String(email) });
    if (!user) {
      return res.status(404).json({ message: "Email non trovata." });
    }

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 ora
    await user.save();

    const frontendUrl =
      process.env.NODE_ENV === "production"
        ? "https://skibidi-film.vercel.app"
        : "http://localhost:5173";

    const resetUrl = `${frontendUrl}/reset-password/${token}`;

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

    await emailApi.sendTransacEmail(sendSmtpEmail);

    res.json({ message: "Email di recupero inviata!" });
  } catch (error) {
    console.error("Errore invio email Brevo:", error?.response?.text || error.message);
    res.status(500).json({ message: "Errore invio email." });
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  try {
    const user = await User.findOne({
      resetPasswordToken: String(token),
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
      const emailExists = await User.findOne({ email: String(email), _id: { $ne: req.user.id } });
      if (emailExists) return res.status(400).json({ message: "Email già in uso." });
    }

    if (username) {
      if (username.length > 10) {
        return res.status(400).json({ message: "Il nome utente non può superare i 10 caratteri." });
      }
      const usernameExists = await User.findOne({ username: String(username), _id: { $ne: req.user.id } });
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

    const reviews = await Review.find({ user: String(userId) }).populate("movie", "media_type").lean();
    let moviesReviewed = 0;
    let tvShowsReviewed = 0;

    reviews.forEach(r => {
      if (r.movie) {
        if (r.movie.media_type === "tv") {
          tvShowsReviewed++;
        } else {
          moviesReviewed++;
        }
      }
    });

    const followersCount = user.followers ? user.followers.length : 0;
    const followingCount = user.following ? user.following.length : 0;

    res.json({
      username: user.username,
      moviesReviewed,
      tvShowsReviewed,
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

    // Otteniamo tutte le recensioni popolate con solo campi richiesti e lean() per saltare i doc Mongoose
    const reviews = await Review.find({ user: String(userId) })
      .populate({
        path: "movie",
        select: "media_type title tmdb_id release_year cast director production_companies crew genres runtime production_countries original_language keywords"
      })
      .lean();

    // Filtra recensioni valide (dove il film esiste ancora e NON è una serie tv)
    const validReviews = reviews.filter(r => r.movie && r.movie.media_type !== "tv");

    // 1. Top 10 Film dell'anno specifico & 2. Top 10 Film All Time (voto più alto)
    const topYear = validReviews
      .filter(r => r.movie.release_year === targetYear)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    const topAllTime = [...validReviews]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 10);

    // Variabili per global count ed esclusione
    const EXCLUDED_TITLES = [
      "Iron Man", "L'incredibile Hulk", "L'Incredibile Hulk", "Iron Man 2", "Thor", 
      "Captain America - Il primo Vendicatore", "Captain America: Il primo Vendicatore", "The Avengers",
      "Iron Man 3", "Thor: The Dark World", "Captain America: The Winter Soldier",
      "Guardiani della Galassia", "Avengers: Age of Ultron", "Ant-Man",
      "Captain America: Civil War", "Doctor Strange", "Guardiani della Galassia Vol. 2",
      "Guardiani della Galassia Volume 2", "Spider-Man: Homecoming", "Thor: Ragnarok",
      "Black Panther", "Avengers: Infinity War", "Ant-Man and the Wasp", 
      "Captain Marvel", "Avengers: Endgame", "Spider-Man: Far From Home",
      "Black Widow", "Shang-Chi e la leggenda dei Dieci Anelli", "Eternals", 
      "Spider-Man: No Way Home", "Doctor Strange nel Multiverso della Follia", 
      "Thor: Love and Thunder", "Black Panther: Wakanda Forever",
      "Ant-Man and the Wasp: Quantumania", "Guardiani della Galassia Vol. 3", 
      "Guardiani della Galassia Volume 3", "The Marvels",
      "Deadpool & Wolverine", "Captain America: Brave New World", "Thunderbolts*",
      "The Fantastic Four: First Steps", "Spider-Man: Brand New Day",
      "Avengers: Doomsday", "Avengers: Secret Wars",
      "X-Men", "X-Men 2", "X-Men - Conflitto finale", "X-Men - L'inizio",
      "X-Men - Giorni di un futuro passato", "X-Men: Apocalisse", "X-Men: Dark Phoenix",
      "X-Men le origini - Wolverine", "X-Men le origini: Wolverine", "Wolverine - L'immortale", "Logan - The Wolverine",
      "Deadpool", "Deadpool 2",
      "Spider-Man", "Spider-Man 2", "Spider-Man 3"
    ];
    const EXCLUDED_IDS = [
      1726, 1724, 10138, 10195, 1771, 24428, 68721, 76338, 100402, 283995, 
      99861, 102899, 271110, 453395, 315635, 284053, 284054, 299536, 363088, 
      299537, 299534, 429617, 497698, 566525, 524434, 634649, 616037, 505642, 
      640146, 447365, 609681, 533535, 822119, 986056, 617126, 969681, 1003596, 
      1003598, 246655, 36658, 36668, 49538, 127585, 320288, 2080, 76170, 
      263115, 293660, 383498, 102382, 559, 114
    ];
    const EXCLUDED_ACTORS = ["Joseph Oliveira", "Stan Lee"];

    let totalRuntime = 0;
    const countriesSet = new Set();
    const allDirectorsSet = new Set();

    // Contatori per iterazione singola
    const actorsCount = {};
    const directorsCount = {};
    const studiosCount = {};
    const crewJobsStats = {};
    const genreStats = {};
    const decadeStats = {};
    const countriesCount = {};
    const langsCount = {};
    const keywordsStats = {};

    const LANGUAGE_NAMES = {
      en: "English", fr: "French", it: "Italian", de: "German", es: "Spanish",
      ja: "Japanese", ko: "Korean", zh: "Chinese", pt: "Portuguese",
      ru: "Russian", hi: "Hindi", ar: "Arabic", nl: "Dutch", sv: "Swedish",
      da: "Danish", fi: "Finnish", nb: "Norwegian", tr: "Turkish", pl: "Polish",
      cs: "Czech", hu: "Hungarian", ro: "Romanian", el: "Greek", he: "Hebrew",
      th: "Thai", id: "Indonesian", vi: "Vietnamese", uk: "Ukrainian",
      cn: "Cantonese", fa: "Persian", sr: "Serbian",
    };

    // --- CICLO UNICO PERTUTTE LE STATISTICHE ---
    for (const r of validReviews) {
      const m = r.movie;
      const rating = Number(r.rating) || 0;

      if (m.runtime) totalRuntime += m.runtime;

      if (m.production_countries) {
        for (const c of m.production_countries) {
          countriesSet.add(c);
          countriesCount[c] = (countriesCount[c] || 0) + 1;
        }
      }

      if (m.director) {
        allDirectorsSet.add(m.director);
        directorsCount[m.director] = (directorsCount[m.director] || 0) + 1;
      }

      if (!(EXCLUDED_TITLES.includes(m.title) || EXCLUDED_IDS.includes(m.tmdb_id))) {
        if (m.cast && Array.isArray(m.cast)) {
          for (const actor of m.cast) {
            if (!EXCLUDED_ACTORS.includes(actor)) {
              actorsCount[actor] = (actorsCount[actor] || 0) + 1;
            }
          }
        }
      }

      if (m.production_companies) {
        for (const studio of m.production_companies) {
          studiosCount[studio] = (studiosCount[studio] || 0) + 1;
        }
      }

      if (m.crew && Array.isArray(m.crew)) {
        for (const c of m.crew) {
          if (!crewJobsStats[c.job]) crewJobsStats[c.job] = {};
          crewJobsStats[c.job][c.name] = (crewJobsStats[c.job][c.name] || 0) + 1;
        }
      }

      if (m.genres && Array.isArray(m.genres)) {
        for (const genre of m.genres) {
          let gName = typeof genre === 'object' && genre.name ? genre.name : genre;
          gName = String(gName).trim();
          if (gName) {
            if (!genreStats[gName]) genreStats[gName] = { count: 0, sum: 0 };
            genreStats[gName].count += 1;
            genreStats[gName].sum += rating;
          }
        }
      }

      if (m.release_year) {
        let decade = Math.floor(m.release_year / 10) * 10;
        let decadeName = decade >= 2000 ? `Anni ${decade}` : `Anni '${String(decade).slice(2)}`;
        if (!decadeStats[decadeName]) decadeStats[decadeName] = { count: 0, sum: 0 };
        decadeStats[decadeName].count += 1;
        decadeStats[decadeName].sum += rating;
      }

      if (m.original_language) {
        const code = m.original_language;
        const name = LANGUAGE_NAMES[code] || code.toUpperCase();
        langsCount[name] = (langsCount[name] || 0) + 1;
      }

      if (m.keywords && Array.isArray(m.keywords)) {
        for (const k of m.keywords) {
          if (!keywordsStats[k]) keywordsStats[k] = { count: 0, sum: 0 };
          keywordsStats[k].count += 1;
          keywordsStats[k].sum += rating;
        }
      }
    }

    // Helper per conversione e top-N
    const toTopList = (dict, limitSize = limit) => 
      Object.entries(dict)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limitSize);

    const mapRatings = (dict) => Object.entries(dict).map(([name, data]) => ({
      name, count: data.count, avg: data.count > 0 ? Number((data.sum / data.count).toFixed(1)) : 0
    }));

    const topActors = toTopList(actorsCount);
    const topDirectors = toTopList(directorsCount);
    const topStudios = toTopList(studiosCount);
    const topCountries = toTopList(countriesCount);
    const topLanguages = toTopList(langsCount);

    const topCrewByJob = {};
    for (const job in crewJobsStats) {
      topCrewByJob[job] = toTopList(crewJobsStats[job]);
    }

    const allGenresData = mapRatings(genreStats);
    const topGenres = [...allGenresData].sort((a, b) => b.count - a.count).slice(0, limit);
    const topGenresByRating = [...allGenresData].filter(g => g.count >= 1).sort((a, b) => b.avg - a.avg).slice(0, limit);

    const allDecadesData = mapRatings(decadeStats);
    const topDecades = [...allDecadesData].sort((a, b) => b.count - a.count).slice(0, limit);
    const topDecadesByRating = [...allDecadesData].filter(g => g.count >= 1).sort((a, b) => b.avg - a.avg).slice(0, limit);

    const allKeywordsData = mapRatings(keywordsStats);
    const topKeywords = [...allKeywordsData].sort((a, b) => b.count - a.count).slice(0, 30);
    const topKeywordsByRating = [...allKeywordsData].filter(k => k.count >= 1).sort((a, b) => b.avg - a.avg).slice(0, 30);

    const totalFilms = validReviews.length;
    const totalHours = Math.floor(totalRuntime / 60);
    const totalCountries = countriesSet.size;
    const totalDirectors = allDirectorsSet.size;

    res.json({
      username: user.username,
      topYear,
      targetYear,
      topAllTime,
      topActors,
      topDirectors,
      topGenres,
      topGenresByRating,
      topDecades,
      topDecadesByRating,
      topStudios,
      topCrewByJob,
      topCountries,
      topLanguages,
      topKeywords,
      topKeywordsByRating,
      totalFilms,
      totalHours,
      totalDirectors,
      totalCountries
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
      recipient: String(req.params.userId),
      sender: req.user.id,
      type: "new_follower",
    });
    // Push Notification for new follower
    try {
      const PushSubscription = require("../models/PushSubscription");
      const webpush = require("web-push");

      const subs = await PushSubscription.find({ user: req.params.userId });
      
      if (subs.length > 0) {
        const follower = await User.findById(req.user.id).select("username");
        const payload = JSON.stringify({
          title: "Nuovo Follower!",
          body: `${follower.username} ha iniziato a seguirti.`,
          url: `/profile/${req.user.id}`
        });

        for (let sub of subs) {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: sub.keys },
            payload
          ).catch(async err => {
            if (err.statusCode === 410) {
              await sub.deleteOne();
            } else {
              console.error("Push Notification Delivery Error (non-410):", err);
            }
          });
        }
      }
    } catch (e) {
      console.error("Push Notification Error (follow):", e);
    }
    
    res.json({ message: "Seguito!" });
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
  }
};
// --- OBIETTIVI (GOALS) ---

exports.createGoal = async (req, res) => {
  try {
    const { title, targetFrequency, year } = req.body;
    
    // Controlla se l'utente ha già un obiettivo per quell'anno (opzionale, ma consigliato per evitare spam)
    const existingGoal = await Goal.findOne({ user: req.user.id, year: Number(year) });
    if (existingGoal) {
      return res.status(400).json({ message: `Hai già un obiettivo impostato per il ${year}.` });
    }

    const goal = new Goal({
      user: req.user.id,
      title: title || "Film da guardare",
      targetFrequency,
      year: year || new Date().getFullYear()
    });

    await goal.save();
    res.status(201).json(goal);
  } catch (error) {
    console.error("Errore creazione goal:", error);
    res.status(500).json({ message: "Errore server nella creazione dell'obiettivo." });
  }
};

exports.getUserGoals = async (req, res) => {
  try {
    const userId = req.params.userId;
    const goals = await Goal.find({ user: String(userId) }).sort({ year: -1 });

    // Per ogni goal, calcoliamo i film visti in quell'anno
    const goalsWithProgress = await Promise.all(goals.map(async (goal) => {
      // Trova le recensioni (solo film, non tv) di questo utente fatte nell'anno del goal
      // Attenzione: usiamo la data in cui ha *registrato* la recensione
      const startDate = new Date(`${goal.year}-01-01T00:00:00Z`);
      const endDate = new Date(`${goal.year}-12-31T23:59:59Z`);

      // Count solo Reviews che hanno un reference a un movie e non sono post
      const reviewsThisYear = await Review.find({
        user: userId,
        isPost: { $ne: true },
        createdAt: { $gte: startDate, $lte: endDate }
      }).populate('movie').lean();
      
      const watchedReviews = reviewsThisYear.filter(r => r.movie && r.movie.media_type !== "tv");
      const moviesWatchedThisYear = watchedReviews.length;
      
      // Mappa i dati dei film visti per mostrarli nel frontend (id, titolo, poster, voto)
      const watchedMoviesList = watchedReviews.map(r => ({
        reviewId: r._id,
        movieId: r.movie.tmdb_id,
        title: r.movie.title,
        poster_path: r.movie.poster_path,
        rating: r.rating,
        dateWatched: r.createdAt
      }));

      return {
        ...goal._doc,
        currentCount: moviesWatchedThisYear,
        watchedMovies: watchedMoviesList
      };
    }));

    res.json(goalsWithProgress);
  } catch (error) {
    console.error("Errore recupero goals:", error);
    res.status(500).json({ message: "Errore server nel recupero degli obiettivi." });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);
    if (!goal) return res.status(404).json({ message: "Obiettivo non trovato." });

    if (goal.user.toString() !== req.user.id) {
      return res.status(401).json({ message: "Non autorizzato." });
    }

    await goal.deleteOne();
    res.json({ message: "Obiettivo rimosso." });
  } catch (error) {
    console.error("Errore eliminazione goal:", error);
    res.status(500).json({ message: "Errore server nell'eliminazione dell'obiettivo." });
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
      .populate("movie", "title poster_path tmdb_id media_type release_year")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const validReviews = reviews.filter((r) => r.user && r.movie);

    let finalFeed = validReviews;

    // Se siamo alla prima pagina, uniamo anche i Post (Annunci admin attivi)
    if (page === 1) {
      const activePosts = await Post.find({ expiresAt: { $gt: Date.now() } })
        .populate("user", "username avatar_url")
        .sort({ createdAt: -1 });

      // Mappiamo i post per dare loro una struttura uniformemente gestibile dal frontend
      const formattedPosts = activePosts.map((post) => ({
        ...post.toObject(),
        isPost: true,
      }));

      // Inseriamo i post admin SOPRA alle recensioni
      finalFeed = [...formattedPosts, ...validReviews];
    }

    res.json(finalFeed);
  } catch (error) {
    console.error("Errore Feed:", error);
    res.status(500).json({ message: "Errore server." });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ user: String(req.params.userId) })
      .populate("movie", "tmdb_id title poster_path media_type release_year")
      .sort({ createdAt: -1 });

    res.json(reviews.filter((r) => r.movie));
  } catch (error) {
    res.status(500).json({ message: "Errore server" });
  }
};

exports.getUserLists = async (req, res) => {
  try {
    const lists = await MovieList.find({ user: String(req.params.userId) }).sort({
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

// --- RICERCA UTENTI (per @mention autocomplete) ---
exports.searchUsers = async (req, res) => {
  try {
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit) || 5;
    if (!q.trim()) return res.json([]);
    const users = await User.find({
      username: { $regex: `^${q.trim()}`, $options: 'i' },
    })
      .select('_id username avatar_url')
      .limit(limit);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Errore server' });
  }
};

// --- COLLEZIONI PARZIALI INTELLIGENTI (Ora legge dal DB Cache) ---
exports.getPartialCollections = async (req, res) => {
  const User = require('../models/User');
  const userId = req.user.id; // Prende l'ID dal token JWT
  console.log(`[ROUTE] getPartialCollections per userId: ${userId}`);

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utente non trovato." });

    // Se per qualche motivo la cache è vuota o manca, restituiamo un array vuoto
    // La sincronizzazione avverrà alla prossima recensione o possiamo forzarla se necessario
    const partials = user.partialCollections || [];
    
    // TRIGGER AUTOMATICO: Se la cache è vuota, avviamo una sincronizzazione in background
    // Non usiamo 'await' così la risposta è immediata (niente timeout)
    if (partials.length === 0) {
      console.log(`[SYNC-AUTO] Trigger background sync per ${userId}`);
      exports.syncUserCollections(userId).catch(err => console.error("Errore background sync:", err));
    }
    
    // Ordina per film mancanti (più vicini al completamento in alto)
    partials.sort((a, b) => a.missing - b.missing);
    
    res.json(partials);
  } catch (error) {
    console.error('Errore getPartialCollections:', error);
    res.status(500).json({ message: 'Errore del server nel recupero saghe.' });
  }
};

// --- SINCRONIZZAZIONE MANUALE (per il pulsante nel frontend) ---
exports.manualSyncSagas = async (req, res) => {
  const userId = req.user.id; // Prende l'ID dal token JWT
  const User = require('../models/User');
  try {
    console.log(`[SYNC-MANUAL] Inizio sincronizzazione per ${userId}`);
    await exports.syncUserCollections(userId);
    const user = await User.findById(userId);
    res.json(user.partialCollections || []);
  } catch (error) {
    console.error('Errore manualSyncSagas:', error);
    res.status(500).json({ message: 'Sincronizzazione fallita.' });
  }
};



// --- HELPER: SINCRONIZZAZIONE COLLEZIONI (chiamato su ogni add/delete recensione) ---
exports.syncUserCollections = async (userId) => {
  const axios = require('axios');
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const Movie = require('../models/Movie');
  const User = require("../models/User");
  const Review = require("../models/Review");

  try {
    const reviews = await Review.find({ user: userId }).populate('movie').lean();
    const user = await User.findById(userId);
    if (!user) return;

    const validMovies = reviews.map(r => r.movie).filter(movie => movie && movie.media_type !== "tv");

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
            backdrop_path: ci.backdrop_path,
            reviewedTmdbIds: new Set()
          });
        }
        collectionMap.get(ci.id).reviewedTmdbIds.add(Number(movie.tmdb_id));
      }
    }

    // --- Verifica saghe su TMDB in PARALLELO ---
    const completed = [];
    const partials = [];
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
          
          if (released.length < 2) return; // Non è una vera saga se ha 1 solo film uscito
          
          const seen = released.filter(p => coll.reviewedTmdbIds.has(Number(p.id))).length;
          
          if (seen === released.length) {
            // SAGA COMPLETA
            completed.push({ 
                id: coll.id, 
                name: coll.name, 
                poster_path: coll.poster_path 
            });
          } else if (seen > 0) {
            // SAGA PARZIALE
            partials.push({
              id: coll.id,
              name: coll.name,
              poster_path: coll.poster_path,
              backdrop_path: coll.backdrop_path,
              seen: seen,
              total: released.length,
              missing: released.length - seen
            });
          }
        } catch (err) {
          console.error(`[SYNC] errore saga ${coll.id}:`, err.message);
        }
      })
    );

    // --- Aggiorna il profilo utente con le cache ---
    await User.updateOne(
      { _id: user._id }, 
      { 
        $set: { 
          completedCollections: completed,
          partialCollections: partials
        } 
      }
    );
    
    console.log(`[SYNC] ${user.username}: ${completed.length} complete, ${partials.length} parziali.`);
  } catch (error) {
    console.error('[SYNC] Errore syncUserCollections:', error);
  }
};

exports.getUserFilteredReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const { filter, value, subValue } = req.query;

    const Review = require("../models/Review");
    const reviews = await Review.find({ user: String(userId) }).populate("movie").lean();
    const validReviews = reviews.filter(r => r.movie);

    let filtered = [];

    switch (filter) {
      case "actor":
        filtered = validReviews.filter(r => 
          r.movie.cast && r.movie.cast.includes(value)
        );
        break;
      case "director":
        filtered = validReviews.filter(r => 
          r.movie.director === value
        );
        break;
      case "genre":
        filtered = validReviews.filter(r => 
          r.movie.genres && r.movie.genres.includes(value)
        );
        break;
      case "decade":
        let dStart;
        if (value.startsWith("Anni '")) {
          dStart = 1900 + parseInt(value.replace("Anni '", ""));
        } else {
          dStart = parseInt(value.replace("Anni ", ""));
        }
        filtered = validReviews.filter(r => {
          if (!r.movie.release_year) return false;
          const year = r.movie.release_year;
          return year >= dStart && year < dStart + 10;
        });
        break;
      case "studio":
        filtered = validReviews.filter(r => 
          r.movie.production_companies && r.movie.production_companies.includes(value)
        );
        break;
      case "country":
        filtered = validReviews.filter(r => 
          r.movie.production_countries && r.movie.production_countries.includes(value)
        );
        break;
      case "language":
        const LANGUAGE_NAMES = {
          en: "English", fr: "French", it: "Italian", de: "German", es: "Spanish",
          ja: "Japanese", ko: "Korean", zh: "Chinese", pt: "Portuguese",
          ru: "Russian", hi: "Hindi", ar: "Arabic", nl: "Dutch", sv: "Swedish",
          da: "Danish", fi: "Finnish", nb: "Norwegian", tr: "Turkish", pl: "Polish",
          cs: "Czech", hu: "Hungarian", ro: "Romanian", el: "Greek", he: "Hebrew",
          th: "Thai", id: "Indonesian", vi: "Vietnamese", uk: "Ukrainian",
          cn: "Cantonese", fa: "Persian", sr: "Serbian",
        };
        filtered = validReviews.filter(r => {
          if (!r.movie.original_language) return false;
          const code = r.movie.original_language;
          const name = LANGUAGE_NAMES[code] || code.toUpperCase();
          return name === value;
        });
        break;
      case "keyword":
        filtered = validReviews.filter(r => 
          r.movie.keywords && r.movie.keywords.includes(value)
        );
        break;
      case "crew":
        filtered = validReviews.filter(r => 
          r.movie.crew && r.movie.crew.some(c => c.job === subValue && c.name === value)
        );
        break;
      default:
        filtered = validReviews;
    }

    res.json(filtered);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore server" });
  }
};

// --- SAVED PEOPLE ---
exports.savePerson = async (req, res) => {
  try {
    const { userId } = req.params;
    const { personId, name, profile_path } = req.body;

    if (userId !== req.user.id) {
      return res.status(401).json({ message: "Non autorizzato." });
    }

    if (!personId || !name) {
       return res.status(400).json({ message: "Dati persona mancanti." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utente non trovato." });

    // Controlla se esiste già
    const exists = user.savedPeople && user.savedPeople.some(p => p.id === Number(personId));
    if (exists) {
      return res.status(400).json({ message: "Persona già salvata." });
    }

    const newPerson = {
      id: Number(personId),
      name,
      profile_path
    };

    user.savedPeople.push(newPerson);
    await user.save();

    res.status(201).json({ message: "Persona salvata con successo.", savedPeople: user.savedPeople });
  } catch (error) {
    console.error("Errore savePerson:", error);
    res.status(500).json({ message: "Errore server durante il salvataggio della persona." });
  }
};

exports.removeSavedPerson = async (req, res) => {
  try {
    const { userId, personId } = req.params;

    if (userId !== req.user.id) {
      return res.status(401).json({ message: "Non autorizzato." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Utente non trovato." });

    user.savedPeople = user.savedPeople.filter(p => p.id !== Number(personId));
    await user.save();

    res.json({ message: "Persona rimossa.", savedPeople: user.savedPeople });
  } catch (error) {
    console.error("Errore removeSavedPerson:", error);
    res.status(500).json({ message: "Errore server durante la rimozione della persona." });
  }
};