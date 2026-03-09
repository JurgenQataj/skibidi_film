const express = require("express");
const router = express.Router();
const axios = require("axios");
const { protect } = require("../middleware/authMiddleware");
const GuessYearScore = require("../models/GuessYearScore");


function fischerYatesShuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// 1. GENERARE LA SESSIONE DI GIOCO (8 film)
router.get("/session", async (req, res) => {
  try {
    const tmdbKey = process.env.TMDB_API_KEY;
    if (!tmdbKey) return res.status(500).json({ message: "API Key mancante" });
    
    // Array di ids da escludere inviato dal client frontend
    const excludeIds = req.query.exclude ? req.query.exclude.split(",").map(Number) : [];

    let moviesData = [];
    let pagesFetched = new Set();
    
    // Iteriamo pagine a caso (tra i 500 film più votati/visti della storia di TMDB) 
    while (moviesData.length < 8 && pagesFetched.size < 5) {
       // La top 25 per numero totale di voti contiene letteralmente solo i film più famosi di tutti i tempi
       const page = Math.floor(Math.random() * 25) + 1;
       if (pagesFetched.has(page)) continue;
       pagesFetched.add(page);

       const url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&language=it-IT&sort_by=vote_count.desc&page=${page}`;
       try {
         const response = await axios.get(url);
         const results = response.data.results;

         for (let m of results) {
           if (!excludeIds.includes(m.id) && m.release_date && m.poster_path && !moviesData.find(x => x.tmdb_id === m.id)) {
              const releaseYear = parseInt(m.release_date.split("-")[0], 10);
              moviesData.push({
                tmdb_id: m.id,
                title: m.title,
                original_title: m.original_title,
                poster_path: m.poster_path,
                backdrop_path: m.backdrop_path,
                releaseYear: releaseYear
              });
           }
         }
       } catch (e) {
         console.warn(`TMDB error fetching page ${page}`);
       }
    }

    if (moviesData.length < 8) {
      return res.status(500).json({ message: "Impossibile recuperare abbastanza film" });
    }

    // Mescoliamo ulteriormente i risultati raccolti per entropia e prendiamo i max 8 richiesti (taglio fisso)
    const finalMovies = fischerYatesShuffle(moviesData).slice(0, 8);
    res.json(finalMovies);

  } catch (err) {
    console.error("Errore fetch sessione guess-year:", err);
    res.status(500).json({ message: "Errore server interno." });
  }
});


// 2. RECUPERA SCORES PERSONALE DELLA PERSONA LOGGATA
router.get("/my-score", protect, async (req, res) => {
  try {
    const scoreRecord = await GuessYearScore.findOne({ user: req.user.id });
    if (!scoreRecord) {
      return res.json({ score: 0 });
    }
    return res.json({ score: scoreRecord.score });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// 3. SALVA / AGGIORNA PUNTEGGIO
router.post("/score", protect, async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ message: "Invalid score" });
    }

    let record = await GuessYearScore.findOne({ user: req.user.id });

    if (!record) {
      record = new GuessYearScore({
        user: req.user.id,
        score: score,
      });
      await record.save();
      return res.json({ message: "Primo punteggio salvato", newHighScore: true });
    } else {
      if (score > record.score) {
        record.score = score;
        await record.save();
        return res.json({ message: "Nuovo record personale!", newHighScore: true });
      } else {
        return res.json({ message: "Punteggio salvato, ma nessun nuovo record.", newHighScore: false });
      }
    }
  } catch (err) {
    console.error("Errore save punteggio guess-year:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 4. CLASSIFICA
router.get("/leaderboard", async (req, res) => {
  try {
    const lb = await GuessYearScore.find({})
      .sort({ score: -1, updatedAt: 1 }) // Miglior punteggio, chi lo ha fatto prima in caso di pareggio vince
      .limit(30)
      .populate("user", "username avatar_url");

    res.json(lb);
  } catch (err) {
    console.error("Errore fetch leaderboard guess-year:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
