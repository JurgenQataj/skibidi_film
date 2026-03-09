const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");
const GuessActorScore = require("../models/GuessActorScore");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

function getLastWord(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

// =============================================
// POOL CURATO — 220+ Star Cinema Occidentale (TMDB IDs)
// Solo attori viventi, famosi, nessun attore asiatico
// =============================================
const HOLLYWOOD_ACTOR_IDS = [

  // ── LEGGENDE VIVENTI ──────────────────────────────────────
  134,     // Al Pacino
  17419,   // Robert De Niro
  192,     // Morgan Freeman
  3636,    // Anthony Hopkins
  3295,    // Harrison Ford
  6385,    // Clint Eastwood
  8691,    // Jack Nicholson
  5081,    // Meryl Streep
  11945,   // Helen Mirren
  1254,    // Jodie Foster
  7467,    // Sigourney Weaver
  13240,   // Denzel Washington
  10399,   // Samuel L. Jackson
  8325,    // John Travolta
  3896,    // Sylvester Stallone
  62,      // Bruce Willis
  19292,   // Ralph Fiennes
  3041,    // George Clooney
  7513,    // Jeff Bridges
  1019,    // Kevin Bacon
  3295,    // Harrison Ford
  7934,    // Michelle Pfeiffer
  8399,    // Sharon Stone
  174,     // Uma Thurman
  5064,    // Cameron Diaz
  5290,    // Drew Barrymore

  // ── SUPERSTAR ANNI '90-2000 ───────────────────────────────
  6193,    // Leonardo DiCaprio
  287,     // Brad Pitt
  31,      // Tom Hanks
  3223,    // Robert Downey Jr.
  5469,    // Tom Cruise
  3085,    // Keanu Reeves
  1892,    // Matt Damon
  2888,    // Will Smith
  85,      // Johnny Depp
  2380,    // Russell Crowe
  8784,    // Jim Carrey
  1810,    // Nicolas Cage
  64,      // Gary Oldman
  9780,    // Jude Law
  2224,    // Liam Neeson
  2959,    // Joaquin Phoenix
  1336,    // Edward Norton
  2876,    // Christian Bale
  680,     // Christoph Waltz
  9669,    // Colin Firth
  3995,    // Mark Ruffalo
  1903,    // Ethan Hawke
  1230,    // Sean Penn
  29092,   // Adrien Brody
  5637,    // Adam Sandler
  9016,    // James Franco
  64742,   // Tobey Maguire
  12589,   // Laurence Fishburne
  4517,    // Billy Bob Thornton
  4495,    // Steve Carell
  9744,    // Seth Rogen
  23659,   // Will Ferrell
  10980,   // Shia LaBeouf
  3,       // Julia Roberts
  3742,    // Natalie Portman
  3932,    // Charlize Theron
  112,     // Cate Blanchett
  1480,    // Reese Witherspoon
  11701,   // Angelina Jolie
  21684,   // Anne Hathaway
  1927,    // Halle Berry
  8167,    // Sandra Bullock
  2586,    // Gwyneth Paltrow
  10205,   // Amy Adams
  12952,   // Rachel McAdams
  9273,    // Mila Kunis
  19785,   // Megan Fox
  1785,    // Kate Winslet
  7523,    // Kirsten Dunst
  19537,   // Salma Hayek
  14075,   // Naomi Watts
  5290,    // Drew Barrymore
  17043,   // Blake Lively
  1327,    // Nicole Kidman
  45,      // Winona Ryder
  2976,    // Patricia Arquette

  // ── MARVEL / BLOCKBUSTER GENERATION ─────────────────────
  74568,   // Chris Hemsworth
  16828,   // Chris Evans
  73457,   // Chris Pratt
  10859,   // Ben Affleck
  18918,   // Ryan Reynolds
  1100,    // Dwayne Johnson
  6968,    // Hugh Jackman
  15358,   // Michael Fassbender
  15653,   // Benedict Cumberbatch
  11288,   // Paul Bettany
  12835,   // Josh Brolin
  10838,   // Paul Rudd
  37221,   // Jeremy Renner
  2524,    // Tom Hardy
  29735,   // Idris Elba
  51329,   // Oscar Isaac
  10398,   // Jamie Foxx
  57755,   // Don Cheadle
  11159,   // Forest Whitaker
  44451,   // Jon Bernthal
  15250,   // Aaron Paul
  22215,   // Michael B. Jordan
  29157,   // Lupita Nyong'o
  57461,   // Brie Larson
  1136406, // Tom Holland
  10990,   // Jake Gyllenhaal
  8278,    // Cillian Murphy
  67605,   // Henry Cavill
  90633,   // Gal Gadot
  1245,    // Scarlett Johansson

  // ── GENERAZIONE 2010 ─────────────────────────────────────
  30614,   // Ryan Gosling
  54693,   // Emma Stone
  72129,   // Jennifer Lawrence
  1373737, // Florence Pugh
  1190668, // Timothée Chalamet
  24045,   // Andrew Garfield
  10513,   // Zac Efron
  17694,   // Anna Kendrick
  224513,  // Ana de Armas
  1813,    // Jennifer Aniston
  234352,  // Margot Robbie
  32747,   // Anya Taylor-Joy
  24724,   // Jessica Chastain
  35193,   // Emilia Clarke
  73649,   // Lily James
  58786,   // Olivia Colman
  3084,    // Viola Davis
  22226,   // Emma Roberts
  1532,    // Kit Harington
  976,     // Jason Statham
  1253360, // Pedro Pascal
  1903,    // Ethan Hawke
  60073,   // James McAvoy
  51736,   // Michael Shannon
  10184,   // Matthew McConaughey
  3061,    // Viggo Mortensen
  5248,    // Javier Bardem
  5292,    // Antonio Banderas
  11086,   // Ian McKellen
  54916,   // Emma Watson
  7482,    // Keira Knightley
  36592,   // Carey Mulligan
  65731,   // Lady Gaga
  52548,   // Olivia Wilde
  1147193, // Sophie Turner
  932967,  // Maisie Williams
  1251659, // Jodie Comer

  // ── NUOVA GENERAZIONE (2020+) ────────────────────────────
  505710,  // Zendaya
  82490,   // Jacob Elordi
  1158982, // Austin Butler
  71580,   // Sydney Sweeney
  18999,   // Amanda Seyfried
  56729,   // Chloë Grace Moretz
  148988,  // Hailee Steinfeld
  1185418, // Daisy Ridley
  1023483, // Saoirse Ronan
  1055738, // Barry Keoghan
  1097226, // Paul Mescal
  450802,  // Miles Teller
  72384,   // Evan Peters
  26502,   // David Harbour
  1176880, // Taron Egerton
  37083,   // Robert Pattinson
  940983,  // Joey King
  1635463, // Thomasin McKenzie
  1465564, // Millie Bobby Brown
  3375244, // Jenna Ortega
  1544761, // Mia Goth
  368524,  // Selena Gomez
  1285334, // Jeremy Allen White
  237584,  // Glen Powell
  1700908, // John David Washington
  298413,  // Ansel Elgort
];

// Dedup
const ACTOR_POOL = [...new Set(HOLLYWOOD_ACTOR_IDS)];

// =============================================
// POOL DINAMICO (300 Attori Famosi)
// Generato in background avviando il server
// =============================================
let dynamicActorPool = [];
const TARGET_POOL_SIZE = 300;

const EXCLUDED_BIRTHPLACE_KEYWORDS = [
  "india", "pakistan", "bangladesh", "sri lanka", "nepal",
  "mumbai", "delhi", "karachi", "lahore", "dhaka", "chennai", "kolkata", "punjab", "hyderabad",
  "egypt", "morocco", "libya", "tunisia", "algeria", "cairo", "casablanca", "tripoli", "tunis",
  "china", "beijing", "shanghai", "hong kong", "taiwan", "seoul", "korea", "japan", "tokyo", "asia",
  "philippines", "manila", "thailand", "bangkok", "vietnam", "hanoi", "indonesia", "jakarta", "malaysia",
];

function isExcludedBirthplace(p) {
  if (!p) return false;
  const l = p.toLowerCase();
  return EXCLUDED_BIRTHPLACE_KEYWORDS.some((k) => l.includes(k));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function buildDynamicPool() {
  console.log("[GuessActor] Iniziata la costruzione del pool dei top 300 attori viventi e occidentali...");
  const actorMap = new Map();
  
  // Cerchiamo nelle prime 100 pagine di attori famosi
  for (let page = 1; page <= 100; page++) {

    try {
      const listRes = await axios.get(`${TMDB_BASE}/person/popular`, {
        params: { api_key: TMDB_API_KEY, language: "en-US", page },
        timeout: 8000,
      });

      const candidates = listRes.data.results.filter(
        (p) => p.known_for_department === "Acting" && p.profile_path && !actorMap.has(p.id)
      );

      for (const c of candidates) {
        // Rimuoviamo il break early basato solo sulla size, così continuiamo ad aggiungere 
        // e rimpiazzare attori se ne troviamo di più famosi.
        try {
          const d = await axios.get(`${TMDB_BASE}/person/${c.id}`, {
            params: { api_key: TMDB_API_KEY, language: "it-IT" },
            timeout: 6000,
          }).then(r => r.data);

          // Filtra: vivo, con foto, e senza birthplace esclusa (asiatici/nord africa)
          if (!d.deathday && d.profile_path && !isExcludedBirthplace(d.place_of_birth)) {
            actorMap.set(d.id, {
              id: d.id,
              name: d.name,
              lastName: getLastWord(d.name),
              profile_path: d.profile_path,
              popularity: c.popularity,
            });
            
            // Ordiniamo per popolarità dal più famoso al meno famoso e teniamo solo i top 300
            dynamicActorPool = [...actorMap.values()]
              .sort((a, b) => b.popularity - a.popularity)
              .slice(0, TARGET_POOL_SIZE);
              
            // Rimuoviamo dalla mappa quelli scartati per non pesare in memoria
            actorMap.clear();
            dynamicActorPool.forEach(actor => actorMap.set(actor.id, actor));
          }
          await sleep(100);
        } catch { /* skip err */ }
      }
      
      await sleep(200);
    } catch (err) {
      console.warn(`[GuessActor] Errore pagina TMDB ${page}:`, err.message);
    }
  }
  
  console.log(`[GuessActor] ✅ Pool completato. Ottenuti ${dynamicActorPool.length} attori da far indovinare.`);
}

buildDynamicPool().catch(() => {});

// GET /api/guess-actor/session
router.get("/session", protect, async (req, res) => {
  try {
    // 1) Se il pool dinamico è quasi pronto, usiamo quello in cache (istantaneo e filtrato!)
    if (dynamicActorPool.length >= 30) {
      const shuffled = [...dynamicActorPool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return res.json(shuffled.slice(0, 6));
    }

    // 2) Fallback: se il pool è ancora vuoto al primissimo avvio del server
    const shuffled = [...ACTOR_POOL];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const candidates = shuffled.slice(0, 12);

    const actorResults = await Promise.allSettled(
      candidates.map((id) =>
        axios.get(`${TMDB_BASE}/person/${id}`, {
          params: { api_key: TMDB_API_KEY, language: "it-IT" },
        })
      )
    );

    const finalActors = actorResults
      .filter((r) => r.status === "fulfilled" && r.value.data.profile_path && !r.value.data.deathday)
      .map((r) => r.value.data)
      .slice(0, 6)
      .map((a) => ({
        id: a.id,
        name: a.name,
        lastName: getLastWord(a.name),
        profile_path: a.profile_path,
        popularity: a.popularity,
      }));

    if (finalActors.length < 6) {
      return res.status(500).json({ error: "Non ci sono abbastanza attori disponibili." });
    }

    res.json(finalActors);
  } catch (err) {
    console.error("Guess actor session error:", err.message);
    res.status(500).json({ error: "Failed to create session" });
  }
});

// POST /api/guess-actor/score
router.post("/score", protect, async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== "number" || score < 0) {
      return res.status(400).json({ error: "Invalid score" });
    }

    const existing = await GuessActorScore.findOne({ user: req.user.id });
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        await existing.save();
      }
      return res.json(existing);
    }

    const newScore = await GuessActorScore.create({ user: req.user.id, score });
    res.json(newScore);
  } catch (err) {
    console.error("Guess actor score error:", err.message);
    res.status(500).json({ error: "Failed to save score" });
  }
});

// GET /api/guess-actor/my-score
router.get("/my-score", protect, async (req, res) => {
  try {
    const existing = await GuessActorScore.findOne({ user: req.user.id });
    res.json({ score: existing ? existing.score : 0 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch score" });
  }
});

// GET /api/guess-actor/leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const scores = await GuessActorScore.find()
      .sort({ score: -1 })
      .limit(20)
      .populate("user", "username avatar_url");
    res.json(scores);
  } catch (err) {
    console.error("Guess actor LB error:", err.message);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

module.exports = router;
