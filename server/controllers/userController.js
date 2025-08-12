const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken"); // <-- AGGIUNGI QUESTA RIGA

// Funzione per registrare un nuovo utente (ORA CON CODICE D'INVITO)
exports.registerUser = async (req, res) => {
  // Aggiungiamo 'inviteCode' alla lista di dati che riceviamo
  const { username, password, inviteCode } = req.body;

  // NUOVO CONTROLLO: Verifichiamo il codice d'invito
  if (inviteCode !== process.env.REGISTRATION_SECRET_CODE) {
    return res.status(403).json({ message: "Codice d'invito non valido." });
  }

  // Il resto della funzione rimane quasi invariato
  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Per favore, inserisci username e password." });
  }
  try {
    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    if (existingUsers.length > 0) {
      return res
        .status(409)
        .json({ message: "Questo username è già stato preso." });
    }
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    await db.query(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)",
      [username, password_hash]
    );
    res
      .status(201)
      .json({ message: `Utente '${username}' registrato con successo!` });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Errore del server durante la registrazione." });
  }
};

// Funzione per il login di un utente
exports.loginUser = async (req, res) => {
  // 1. Prendi username e password dalla richiesta
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Per favore, inserisci username e password." });
  }

  try {
    // 2. Cerca l'utente nel database
    const [users] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    const user = users[0];

    // Se l'utente non esiste, invia un errore generico
    if (!user) {
      return res.status(401).json({ message: "Credenziali non valide." }); // Non dire "utente non trovato" per sicurezza
    }

    // 3. Confronta la password inviata con quella crittografata nel database
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: "Credenziali non valide." }); // Errore generico anche qui
    }

    // 4. Se le credenziali sono corrette, crea il Token JWT (la "chiave")
    const payload = {
      user: {
        id: user.id,
        username: user.username,
      },
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Il token scadrà tra 7 giorni
    );

    // 5. Invia il token al client
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Errore del server durante il login." });
  }
};

// Funzione per ottenere TUTTE le recensioni di un singolo utente (ORA IN ORDINE CRONOLOGICO)
exports.getUserReviews = async (req, res) => {
  try {
    const { userId } = req.params;
    const [reviews] = await db.query(
      `SELECT 
                m.tmdb_id, m.title, m.poster_path,
                r.rating, r.comment_text, r.created_at
            FROM reviews AS r
            JOIN movies AS m ON r.movie_id = m.id
            WHERE r.user_id = ?
            ORDER BY r.created_at ASC`, // <-- MODIFICA QUI: da DESC a ASC
      [userId]
    );
    res.json(reviews);
  } catch (error) {
    console.error("Errore nel recupero delle recensioni dell'utente:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.followUser = async (req, res) => {
  const { userId } = req.params; // L'ID dell'utente da seguire
  const followerId = req.user.id; // L'ID di chi sta compiendo l'azione

  console.log(
    `--- FOLLOW DEBUG: L'utente ${followerId} sta tentando di seguire l'utente ${userId} ---`
  );

  if (Number(userId) === followerId) {
    console.log(
      "--- FOLLOW DEBUG: Errore, un utente non può seguire se stesso."
    );
    return res.status(400).json({ message: "Non puoi seguire te stesso." });
  }

  try {
    console.log(
      "--- FOLLOW DEBUG: Eseguo la query di inserimento nel database... ---"
    );
    const [result] = await db.query(
      "INSERT INTO followers (user_id, follower_id) VALUES (?, ?)",
      [userId, followerId]
    );
    console.log(
      "--- FOLLOW DEBUG: Query eseguita. Righe modificate:",
      result.affectedRows
    );

    // Se la query ha successo, creiamo la notifica
    await db.query(
      "INSERT INTO notifications (recipient_id, sender_id, type) VALUES (?, ?, ?)",
      [userId, followerId, "new_follower"]
    );
    console.log("--- FOLLOW DEBUG: Notifica creata. ---");

    res.status(200).json({ message: "Utente seguito con successo." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      console.log(
        "--- FOLLOW DEBUG: Errore, l'utente segue già questa persona."
      );
      return res.status(409).json({ message: "Segui già questo utente." });
    }
    console.error("--- FOLLOW DEBUG: ERRORE CATTURATO ---", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.unfollowUser = async (req, res) => {
  const { userId } = req.params; // L'ID dell'utente da non seguire più
  const followerId = req.user.id; // L'ID di chi sta compiendo l'azione

  try {
    const [result] = await db.query(
      "DELETE FROM followers WHERE user_id = ? AND follower_id = ?",
      [userId, followerId]
    );

    // Controlliamo se è stata effettivamente cancellata una riga
    if (result.affectedRows === 0) {
      return res
        .status(400)
        .json({ message: "Non stai seguendo questo utente." });
    }

    res.status(200).json({ message: "Hai smesso di seguire l'utente." });
  } catch (error) {
    console.error("Errore durante l'unfollow:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.getUserFeed = async (req, res) => {
  const userId = req.user.id;
  const pageSize = 10;
  const page = parseInt(req.query.page || "1", 10);
  const offset = (page - 1) * pageSize;

  try {
    // Step 1: Prendiamo i dati principali delle recensioni
    const [reviews] = await db.query(
      `SELECT 
                r.id, r.rating, r.comment_text, r.created_at,
                m.title AS movie_title, m.poster_path, m.tmdb_id,
                u.username AS review_author, u.id AS author_id
            FROM reviews AS r
            JOIN movies AS m ON r.movie_id = m.id
            JOIN users AS u ON r.user_id = u.id
            JOIN followers AS f ON r.user_id = f.user_id
            WHERE f.follower_id = ?
            ORDER BY r.created_at DESC
            LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    if (reviews.length === 0) {
      return res.json([]);
    }

    // Step 2: Prendiamo tutti i conteggi per le recensioni trovate
    const reviewIds = reviews.map((r) => r.id);

    const [reactions] = await db.query(
      `SELECT review_id, reaction_type, COUNT(*) as count 
             FROM review_reactions WHERE review_id IN (?) 
             GROUP BY review_id, reaction_type`,
      [reviewIds]
    );

    const [commentCounts] = await db.query(
      `SELECT review_id, COUNT(*) as count 
             FROM review_comments WHERE review_id IN (?) 
             GROUP BY review_id`,
      [reviewIds]
    );

    // Step 3: "Incolliamo" i conteggi su ogni recensione
    reviews.forEach((review) => {
      review.reactions = {};
      reactions
        .filter((r) => r.review_id === review.id)
        .forEach((reaction) => {
          review.reactions[reaction.reaction_type] = reaction.count;
        });
      const countData = commentCounts.find((c) => c.review_id === review.id);
      review.comment_count = countData ? countData.count : 0;
    });

    res.json(reviews);
  } catch (error) {
    console.error("Errore durante il recupero del feed:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

exports.getUserLists = async (req, res) => {
  const { userId } = req.params;
  try {
    const [lists] = await db.query(
      "SELECT id, title, description, created_at FROM movie_lists WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    // Creiamo un oggetto speciale per la watchlist e lo mettiamo all'inizio
    const watchlistPseudoList = {
      id: "watchlist", // ID speciale
      title: "Watchlist",
      description: "Film da vedere",
    };

    res.json([watchlistPseudoList, ...lists]); // Invia watchlist + liste
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
exports.getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const [users] = await db.query(
      "SELECT id, username, avatar_url, bio, created_at FROM users WHERE id = ?",
      [userId]
    );
    if (users.length === 0) {
      return res.status(404).json({ message: "Utente non trovato." });
    }
    res.json(users[0]);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per aggiornare il proprio profilo
exports.updateUserProfile = async (req, res) => {
  const userId = req.user.id;
  const { avatar_url, bio } = req.body;
  try {
    await db.query("UPDATE users SET avatar_url = ?, bio = ? WHERE id = ?", [
      avatar_url,
      bio,
      userId,
    ]);
    res.json({ message: "Profilo aggiornato con successo." });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per ottenere le statistiche di un utente
exports.getUserStats = async (req, res) => {
  const { userId } = req.params;

  try {
    const [users] = await db.query("SELECT username FROM users WHERE id = ?", [
      userId,
    ]);
    if (users.length === 0) {
      return res.status(404).json({ message: "Utente non trovato." });
    }
    const username = users[0].username;

    // Eseguiamo tutte le query per le statistiche in parallelo
    const [[moviesReviewedRows], [followersCountRows], [followingCountRows]] =
      await Promise.all([
        db.query("SELECT COUNT(*) as count FROM reviews WHERE user_id = ?", [
          userId,
        ]),
        db.query("SELECT COUNT(*) as count FROM followers WHERE user_id = ?", [
          userId,
        ]),
        db.query(
          "SELECT COUNT(*) as count FROM followers WHERE follower_id = ?",
          [userId]
        ),
      ]);

    // Assembliamo la risposta
    const stats = {
      username: username,
      // CORREZIONE N.1: Usiamo [0].count invece di [0][0].count
      moviesReviewed: moviesReviewedRows[0].count,
      followersCount: followersCountRows[0].count,
      followingCount: followingCountRows[0].count,
    };

    res.json(stats);
  } catch (error) {
    // <-- CORREZIONE N.2: Aggiunte le parentesi graffe { }
    console.error("Errore nel recupero delle statistiche:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};
// ===== INIZIA NUOVO CODICE DA AGGIUNGERE =====

// Funzione speciale per il debug dei dati
exports.getDebugInfo = async (req, res) => {
  const { userId } = req.params;
  try {
    // Chi sta seguendo l'utente?
    const [following] = await db.query(
      "SELECT * FROM followers WHERE follower_id = ?",
      [userId]
    );

    // Quali recensioni esistono in totale?
    const [allReviews] = await db.query(
      "SELECT r.id, r.user_id, u.username FROM reviews r JOIN users u ON r.user_id = u.id"
    );

    res.json({
      user_is_following: following,
      all_reviews_in_database: allReviews,
    });
  } catch (error) {
    console.error("ERRORE NEL DEBUG:", error);
    res.status(500).json({ message: "Errore nel debug" });
  }
};

exports.getFollowStatus = async (req, res) => {
  const { userId } = req.params;
  const followerId = req.user.id;
  try {
    const [result] = await db.query(
      "SELECT * FROM followers WHERE user_id = ? AND follower_id = ?",
      [userId, followerId]
    );
    res.json({ isFollowing: result.length > 0 });
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
// Funzione per ottenere gli utenti con più follower
exports.getMostFollowedUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT 
                u.id, 
                u.username, 
                u.avatar_url, 
                COUNT(f.follower_id) AS followers_count
            FROM users AS u
            LEFT JOIN followers AS f ON u.id = f.user_id
            GROUP BY u.id
            ORDER BY followers_count DESC
            LIMIT 20` // Limitiamo ai primi 20 per non appesantire
    );
    res.json(users);
  } catch (error) {
    console.error("Errore nel recupero degli utenti più seguiti:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per ottenere gli ultimi utenti iscritti
exports.getNewestUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT id, username, avatar_url, created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 20` // Limitiamo ai primi 20
    );
    res.json(users);
  } catch (error) {
    console.error("Errore nel recupero dei nuovi utenti:", error);
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per ottenere la lista dei follower di un utente
exports.getFollowers = async (req, res) => {
  const { userId } = req.params;
  try {
    const [followers] = await db.query(
      `SELECT u.id, u.username, u.avatar_url 
             FROM followers AS f
             JOIN users AS u ON f.follower_id = u.id
             WHERE f.user_id = ?`,
      [userId]
    );
    res.json(followers);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};

// Funzione per ottenere la lista degli utenti seguiti da un utente
exports.getFollowing = async (req, res) => {
  const { userId } = req.params;
  try {
    const [following] = await db.query(
      `SELECT u.id, u.username, u.avatar_url 
             FROM followers AS f
             JOIN users AS u ON f.user_id = u.id
             WHERE f.follower_id = ?`,
      [userId]
    );
    res.json(following);
  } catch (error) {
    res.status(500).json({ message: "Errore del server." });
  }
};
