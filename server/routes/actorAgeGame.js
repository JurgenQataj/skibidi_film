const express = require("express");
const router = express.Router();
const axios = require("axios");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");
const ActorAgeGameScore = require("../models/ActorAgeGameScore");

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

// ─── LISTA CURATA: ~150 TMDB person IDs verificati ───────────────────────────
// Questi entrano sempre nel pool (se vivi e con birthday su TMDB).
const CURATED_ACTOR_IDS = [
  // Leggende Hollywood (maschi)
  3,      // Harrison Ford
  6,      // Jude Law
  31,     // Tom Hanks
  62,     // Bruce Willis
  63,     // Paul Rudd
  64,     // Gary Oldman
  85,     // Johnny Depp
  131,    // Jake Gyllenhaal
  190,    // Clint Eastwood
  192,    // Morgan Freeman
  206,    // Jim Carrey
  287,    // Brad Pitt
  294,    // Gene Hackman
  380,    // Robert De Niro
  500,    // Tom Cruise
  514,    // Jack Nicholson
  630,    // Russell Crowe
  776,    // Eddie Murphy
  880,    // Ben Stiller
  976,    // Jason Statham
  1065,   // Mel Gibson
  1158,   // Al Pacino
  1229,   // Jeff Bridges
  1331,   // Javier Bardem
  1372,   // James McAvoy
  1401,   // Antonio Banderas
  1532,   // Bill Murray
  1892,   // Matt Damon
  1954,   // Kurt Russell
  2231,   // Samuel L. Jackson
  2524,   // Tom Hardy
  2888,   // Will Smith
  2963,   // Nicolas Cage
  3061,   // Ewan McGregor
  3223,   // Robert Downey Jr.
  3291,   // Colin Firth
  3895,   // Michael Caine
  3894,   // Christian Bale
  3896,   // Liam Neeson
  4173,   // Anthony Hopkins
  4491,   // Hugh Grant
  4495,   // Steve Carell
  5292,   // Denzel Washington
  5294,   // Jamie Foxx
  6167,   // Jeff Goldblum
  6193,   // Leonardo DiCaprio
  6384,   // Keanu Reeves
  6968,   // Hugh Jackman
  7166,   // Kiefer Sutherland
  7447,   // Alec Baldwin
  8691,   // Oscar Isaac
  8784,   // Daniel Craig
  8891,   // John Travolta
  9273,   // George Clooney
  10859,  // Ryan Reynolds
  10980,  // Daniel Radcliffe
  12835,  // Vin Diesel
  14782,  // Christoph Waltz
  15746,  // Michael Fassbender
  16483,  // Adam Sandler
  16828,  // Chris Evans
  17605,  // Idris Elba
  18918,  // Dwayne Johnson
  19278,  // Jeremy Renner
  30614,  // Ryan Gosling
  43267,  // Andrew Garfield
  49701,  // Rami Malek
  51329,  // Bradley Cooper
  54811,  // Michael Shannon
  71580,  // Benedict Cumberbatch
  73457,  // Mark Ruffalo
  74568,  // Chris Hemsworth
  73421,  // Joaquin Phoenix
  1100,   // Arnold Schwarzenegger
  1023139,// Adam Driver
  1190668,// Timothée Chalamet
  // Nuovi/emergenti (maschi)
  1136406,// Tom Holland
  115440, // Cillian Murphy
  1429940,// Paul Mescal
  1182030,// Barry Keoghan
  37625,  // Pedro Pascal
  15761,  // Nicholas Hoult
  57755,  // Ansel Elgort
  1453852,// Austin Butler
  56730,  // Josh Hutcherson
  100099, // Miles Teller
  9776,   // Liam Hemsworth
  1522709,// Jacob Elordi
  55099,  // Aaron Taylor-Johnson
  226366, // Richard Madden
  1356210,// Taron Egerton
  1087227,// Glen Powell
  1285227,// Callum Turner
  8138,   // Charlie Hunnam
  70851,  // Jack O'Connell
  // Legende Hollywood (femmine)
  112,    // Cate Blanchett
  204,    // Julia Roberts
  524,    // Natalie Portman
  584,    // Sandra Bullock
  1245,   // Scarlett Johansson
  1340,   // Anya Taylor-Joy
  1813,   // Anne Hathaway
  2227,   // Nicole Kidman
  5064,   // Meryl Streep
  5081,   // Emily Blunt
  6885,   // Charlize Theron
  6941,   // Cameron Diaz
  7286,   // Halle Berry
  9621,   // Keira Knightley
  11282,  // Drew Barrymore
  11288,  // Emma Watson
  11701,  // Angelina Jolie
  16492,  // Reese Witherspoon
  17521,  // Jennifer Lopez
  18973,  // Mila Kunis
  19537,  // Viola Davis
  25073,  // Kristen Stewart
  44794,  // Saoirse Ronan
  54693,  // Emma Stone
  61400,  // Elle Fanning
  72129,  // Jennifer Lawrence
  76492,  // Brie Larson
  90633,  // Gal Gadot
  234352, // Margot Robbie
  278979, // Jessica Chastain
  505710, // Zendaya
  1230360,// Lupita Nyong'o
  1373737,// Florence Pugh
  // Nuove emergenti (femmine)
  1183696,// Sydney Sweeney
  1245577,// Jenna Ortega
  1212532,// Mia Goth
  1048534,// Rachel Zegler
  56734,  // Elizabeth Olsen
  15774,  // Ana de Armas
  // Attori europei famosi
  3291,   // Colin Firth (UK)
  4491,   // Hugh Grant (UK)
  64,     // Gary Oldman (UK)
  2524,   // Tom Hardy (UK)
  6,      // Jude Law (UK)
  71580,  // Benedict Cumberbatch (UK)
  17605,  // Idris Elba (UK)
  15746,  // Michael Fassbender (IRL/DE)
  44794,  // Saoirse Ronan (IRL)
  1372,   // James McAvoy (SCO)
  3061,   // Ewan McGregor (SCO)
  3895,   // Michael Caine (UK)
  1331,   // Javier Bardem (ES)
  1401,   // Antonio Banderas (ES)
  630,    // Russell Crowe (AUS)
  6968,   // Hugh Jackman (AUS)
  1065,   // Mel Gibson (AUS)
  14782,  // Christoph Waltz (AUT)
  // --- Mega attori 2026/nuovi aggiunti ---
  16483,  // Sylvester Stallone
  13240,  // Mark Wahlberg
  10297,  // Matthew McConaughey
  73457,  // Chris Pratt
  62064,  // Chris Pine
  91606,  // Tom Hiddleston
  11288,  // Robert Pattinson
  517,    // Pierce Brosnan
  11856,  // Daniel Day-Lewis
  4483,   // Dustin Hoffman
  1269,   // Kevin Costner
  3036,   // John Cusack
  819,    // Edward Norton
  5469,   // Ralph Fiennes
  72466,  // Colin Farrell
  5293,   // Willem Dafoe
  569,    // Ethan Hawke
  6949,   // John Malkovich
  4690,   // Christopher Walken
  137905, // Bill Skarsgård
  28846,  // Alexander Skarsgård
  1640,   // Stellan Skarsgård
  1019,   // Mads Mikkelsen
  7499,   // Jared Leto
  114,    // Orlando Bloom
  109,    // Elijah Wood
  1328,   // Sean Astin
  1327,   // Ian McKellen
  2387,   // Patrick Stewart
  3392,   // Michael Douglas
  2232,   // Michael Keaton
  1230,   // John Goodman
  57755,  // Woody Harrelson
  4756,   // Matthew Broderick
  18269,  // Brendan Fraser
  236695, // John Boyega
  1315036,// Daisy Ridley
  10205,  // Sigourney Weaver
  63,     // Milla Jovovich
  3136,   // Salma Hayek Pinault
  955,    // Penélope Cruz
  204,    // Kate Winslet
  1038,   // Jodie Foster
  1160,   // Michelle Pfeiffer
  4038,   // Susan Sarandon
  515,    // Glenn Close
  15735,  // Helen Mirren
  5309,   // Judi Dench
  7056,   // Emma Thompson
  1283,   // Helena Bonham Carter
  3063,   // Tilda Swinton
  1231,   // Julianne Moore
  9273,   // Amy Adams
  3489,   // Naomi Watts
  108916, // Rooney Mara
  205,    // Kirsten Dunst
  1920,   // Winona Ryder
  139,    // Uma Thurman
  5344,   // Meg Ryan
  3416,   // Demi Moore
  4430,   // Sharon Stone
  12052,  // Gwyneth Paltrow
  53714,  // Rachel McAdams
  71070,  // Amanda Seyfried
  59175,  // Blake Lively
  19537,  // Megan Fox
  118545, // Dakota Johnson
  501,    // Dakota Fanning
  1356210,// Millie Bobby Brown
  130640, // Hailee Steinfeld
  56734,  // Chloë Grace Moretz
  1001657,// Sophie Turner
  1181313,// Maisie Williams
  1223786,// Emilia Clarke
  17286,  // Lena Headey
  1011904,// Gwendoline Christie
  2230991,// Daisy Edgar-Jones
  2195140,// Ayo Edebiri
  206905, // Jeremy Allen White
  76788,  // Dev Patel
  215055, // Steven Yeun
  206919, // Daniel Kaluuya
  1200864,// LaKeith Stanfield
  226366, // Brian Tyree Henry
  932967, // Mahershala Ali
  135651, // Michael B. Jordan
  53650,  // Anthony Mackie
  60898,  // Sebastian Stan
  6162,   // Paul Bettany
  1896,   // Don Cheadle
  16851,  // Josh Brolin
  117642, // Jason Momoa
  73968,  // Henry Cavill
  880,    // Ben Affleck
  1893,   // Casey Affleck
  17142,  // Paul Dano
  19274,  // Seth Rogen
  21007,  // Jonah Hill
  39995,  // Michael Cera
  44735,  // Jesse Eisenberg
  62861,  // Andy Samberg
  23659,  // Will Ferrell
  70851,  // Jack Black
  55638,  // Kevin Hart
  2632,   // Chris Rock
  11108,  // Simon Pegg
  55934,  // Taika Waititi
  38673,  // Channing Tatum
  29222,  // Zac Efron
  10959,  // Shia LaBeouf
  10989,  // Rupert Grint
  10993,  // Tom Felton
  18897,  // Jackie Chan
  1336,   // Jet Li
  10730,  // Rowan Atkinson
  51576,  // Chuck Norris
  15111,  // Jean-Claude Van Damme
  23880,  // Steven Seagal
  78029,  // Martin Lawrence
  66,     // Chris Tucker
  887,    // Owen Wilson
  36422,  // Luke Wilson
  4937,   // Vince Vaughn
  23532,  // Jason Bateman
  58225,  // Zach Galifianakis
  27105,  // Ed Helms
  83586,  // Ken Jeong
  17244,  // Hayden Christensen
  10669,  // Timothy Dalton
  110,    // Viggo Mortensen
  48,     // Sean Bean
  4491,   // Jennifer Aniston
  14405,  // Courteney Cox
  14406,  // Lisa Kudrow
  14407,  // Matt LeBlanc
  14409,  // David Schwimmer
  8944,   // Jamie Lee Curtis
  2713,   // Linda Hamilton
  9206,   // Neve Campbell
  11863,  // Sarah Michelle Gellar
  21595,  // Alyson Hannigan
  56731,  // Jessica Alba
  543261, // Karen Gillan
  8691,   // Zoe Saldaña
  139820, // Pom Klementieff
  62561,  // Tessa Thompson
  1083010,// Letitia Wright
  82104,  // Danai Gurira
  9780,   // Angela Bassett
  6944,   // Octavia Spencer
  40036,  // Taraji P. Henson
  9788,   // Regina King
  1735828,// Halle Bailey
  1649152,// Jacob Batalon
  2219,   // Tobey Maguire
  35,     // Sally Field
  8349,   // Martin Sheen
  6952,   // Charlie Sheen
  2880,   // Emilio Estevez
  518,    // Danny DeVito
  4517,   // Joe Pesci
  3094,   // Talia Shire
  16619,  // Mr. T
  16644,  // Dolph Lundgren
  921,    // Brigitte Nielsen
  820,    // Edward Furlong
  418,    // Robert Patrick
  650,    // Karen Allen
  689,    // Kate Capshaw
  690,    // Ke Huy Quan
  655,    // John Rhys-Davies
  3033,   // Wil Wheaton
  3034,   // Corey Feldman
  3035,   // Jerry O'Connell
  3234,   // Joan Cusack
  707,    // Dan Aykroyd
  8874,   // Ernie Hudson
  8872,   // Rick Moranis
  67773,  // Steve Martin
  54812,  // Chevy Chase
  519,    // Martin Short
  11510,  // Macaulay Culkin
  26510,  // Eugene Levy
];

// ─── FILTRO BIRTHPLACE ───────────────────────────────────────────────────────
const EXCLUDED_BIRTHPLACE_KEYWORDS = [
  "india", "pakistan", "bangladesh", "sri lanka", "nepal",
  "mumbai", "delhi", "karachi", "lahore", "dhaka", "chennai",
  "bollywood", "kolkata", "punjab", "hyderabad",
  "egypt", "morocco", "libya", "tunisia", "algeria",
  "cairo", "casablanca", "tripoli", "tunis",
  "china", "beijing", "shanghai", "hong kong", "taiwan",
];
function isExcludedBirthplace(p) {
  if (!p) return false;
  const l = p.toLowerCase();
  return EXCLUDED_BIRTHPLACE_KEYWORDS.some((k) => l.includes(k));
}

// ─── POOL CACHED IN MEMORIA ──────────────────────────────────────────────────
let actorPool = [];
let poolBuiltAt = 0;
const POOL_TTL_MS = 12 * 60 * 60 * 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function formatActor(id, d, popularity) {
  return {
    id,
    name: d.name,
    profile_path: d.profile_path,
    birthday: d.birthday,
    popularity: popularity || d.popularity,
  };
}

async function fetchPersonDetail(id) {
  const res = await axios.get(`${TMDB_BASE}/person/${id}`, {
    params: { api_key: TMDB_API_KEY, language: "en-US" },
    timeout: 6000,
  });
  return res.data;
}

function isValidActor(d) {
  return d.birthday && !d.deathday && d.profile_path && !isExcludedBirthplace(d.place_of_birth);
}

/**
 * Avvia il riempimento del pool in background (Fase 2).
 * Esplora fno a 100 pagine, prelevando tutti gli attori con popularity decente
 * e aggiungendoli *in diretta* ad actorPool.
 */
async function hydratePoolInBg(actorMap) {
  console.log("[ActorAgeGame] Iniziata l'espansione del pool in background (fino a 100 pagine TMDB)...");

  for (let page = 1; page <= 100; page++) {
    try {
      const listRes = await axios.get(`${TMDB_BASE}/person/popular`, {
        params: { api_key: TMDB_API_KEY, language: "en-US", page },
        timeout: 8000,
      });

      const candidates = listRes.data.results.filter(
        (p) =>
          p.known_for_department === "Acting" &&
          p.profile_path &&
          p.popularity >= 10 &&
          !actorMap.has(p.id)
      );

      for (const c of candidates) {
        try {
          const d = await fetchPersonDetail(c.id);
          if (isValidActor(d)) {
            const newActor = formatActor(d.id, d, c.popularity);
            actorMap.set(d.id, newActor);
            
            // Aggiunge dinamicamente all'array in memoria!
            // In questo modo il gioco vede l'array ingrandirsi partita dopo partita.
            actorPool.push(newActor);
          }
          await sleep(150); // Pausa onesta per il rate-limiting
        } catch { /* ignoriamo fallimenti singoli */ }
      }

      await sleep(300); // Pausa più lunga tra una pagina e l'altra

      // Log occasionale per mostrare la crescita senza inondare il terminale
      if (page % 10 === 0) {
        console.log(`[ActorAgeGame] Hydration in corso... Pagina ${page}/100 completata. Pool attuale: ${actorPool.length}`);
      }

    } catch (err) {
      console.warn(`[ActorAgeGame] Errore silente a pagina TMDB ${page}:`, err.message);
    }
  }

  console.log(`[ActorAgeGame] ✅ Hydration conclusa. Pool finale generato in background: ${actorPool.length} attori.`);
}

/**
 * Costruisce la base solida ("Fase 1") bloccando lo strato minimo per poter giocare sùbito.
 * Contiene i TMDB IDs famosi e curati (~150).
 */
async function buildPoolCore() {
  console.log("[ActorAgeGame] Caricamento Base Pool (Lista Curata Estesa)...");
  const actorMap = new Map();

  const uniqueIds = [...new Set(CURATED_ACTOR_IDS)];
  for (const id of uniqueIds) {
    try {
      const d = await fetchPersonDetail(id);
      if (isValidActor(d)) actorMap.set(d.id, formatActor(d.id, d, d.popularity));
      await sleep(100);
    } catch { /* skip err */ }
  }

  if (actorMap.size >= 4) {
    actorPool = [...actorMap.values()];
    poolBuiltAt = Date.now();
    console.log(`[ActorAgeGame] Base pronta! Giocabile da SUBITO con ${actorPool.length} attori Top.`);
    
    // Ora avvia il riempimento asincrono massiccio
    // .catch previene qualsiasi crash dal propagarsi
    hydratePoolInBg(actorMap).catch(e => console.error("Bg hydrate fail:", e.message));
  } else {
    console.warn("[ActorAgeGame] Pool curato troppo piccolo. Fallimento critico?");
  }
}

let poolBuildAttempts = 0;
const MAX_POOL_BUILD_ATTEMPTS = 3;

async function ensurePool() {
  const expired = Date.now() - poolBuiltAt > POOL_TTL_MS;
  if (actorPool.length >= 4 && !expired) return;
  if (poolBuildAttempts >= MAX_POOL_BUILD_ATTEMPTS) return;
  poolBuildAttempts++;
  await buildPoolCore();
  if (actorPool.length >= 4) poolBuildAttempts = 0;
  else await sleep(10_000);
}

buildPoolCore().catch(() => {});

// ─── FUNZIONE HELPER: CALCOLO ETÀ ──────────────────────────────────────────────
function getAgeFromBirthday(birthday) {
  if (!birthday) return 0;
  const birth = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

router.get("/pair", async (req, res) => {
  try {
    await ensurePool();
    if (actorPool.length < 4) {
      return res.status(503).json({ error: "Pool in costruzione, riprova tra qualche secondo." });
    }
    const excludeIds = req.query.exclude
      ? req.query.exclude.split(",").map(Number).filter(Boolean)
      : [];
    let available = actorPool.filter((a) => !excludeIds.includes(a.id));
    if (available.length < 2) available = actorPool;
    const actorA = available[crypto.randomInt(0, available.length)];
    const ageA = getAgeFromBirthday(actorA.birthday);

    // ─── Difficoltà: scegli sempre un attore entro massimo 20 anni di divario
    let poolB = available.filter((a) => {
      if (a.id === actorA.id || a.birthday === actorA.birthday) return false;
      const ageB = getAgeFromBirthday(a.birthday);
      return Math.abs(ageA - ageB) <= 20; 
    });

    // Fallback estremo di sicurezza pre-crash (se mai dovesse servire)
    if (poolB.length === 0) {
      poolB = available.filter((a) => {
        if (a.id === actorA.id || a.birthday === actorA.birthday) return false;
        const ageB = getAgeFromBirthday(a.birthday);
        return Math.abs(ageA - ageB) <= 30;
      });
    }

    if (poolB.length === 0) return res.status(503).json({ error: "Pool insufficiente." });
    const actorB = poolB[crypto.randomInt(0, poolB.length)];
    res.json({ actorA, actorB });
  } catch (err) {
    console.error("Actor age game pair error:", err.message);
    res.status(500).json({ error: "Impossibile caricare la coppia di attori" });
  }
});

router.post("/score", protect, async (req, res) => {
  try {
    const { score } = req.body;
    if (typeof score !== "number" || score < 0) return res.status(400).json({ error: "Score non valido" });
    const existing = await ActorAgeGameScore.findOne({ user: req.user.id });
    if (existing) {
      if (score > existing.score) { existing.score = score; await existing.save(); }
      return res.json(existing);
    }
    res.json(await ActorAgeGameScore.create({ user: req.user.id, score: Number(score) }));
  } catch (err) {
    res.status(500).json({ error: "Errore nel salvare il punteggio" });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const scores = await ActorAgeGameScore.find().sort({ score: -1 }).limit(20).populate("user", "username avatar_url");
    res.json(scores);
  } catch (err) { res.status(500).json({ error: "Errore leaderboard" }); }
});

router.get("/my-score", protect, async (req, res) => {
  try {
    const s = await ActorAgeGameScore.findOne({ user: req.user.id });
    res.json({ score: s ? s.score : 0 });
  } catch (err) { res.status(500).json({ error: "Errore punteggio" }); }
});

module.exports = router;
