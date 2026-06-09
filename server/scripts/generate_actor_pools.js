const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

if (!TMDB_API_KEY) {
  console.error("Errore: TMDB_API_KEY non trovata nel file .env!");
  process.exit(1);
}

// --- ARRAY DI ID PRESI DA ACTOR AGE GAME ---
const CURATED_ACTOR_IDS = [
  3, 6, 31, 62, 63, 64, 85, 131, 190, 192, 206, 287, 294, 380, 500, 514, 630, 776, 880, 976,
  1065, 1158, 1229, 1331, 1372, 1401, 1532, 1892, 1954, 2231, 2524, 2888, 2963, 3061, 3223,
  3291, 3895, 3894, 3896, 4173, 4491, 4495, 5292, 5294, 6167, 6193, 6384, 6968, 7166, 7447,
  8691, 8784, 8891, 9273, 10859, 10980, 12835, 14782, 15746, 16483, 16828, 17605, 18918,
  19278, 30614, 43267, 49701, 51329, 54811, 71580, 73457, 74568, 73421, 1100, 1023139, 1190668,
  1136406, 115440, 1429940, 1182030, 37625, 15761, 57755, 1453852, 56730, 100099, 9776,
  1522709, 55099, 226366, 1356210, 1087227, 1285227, 8138, 70851, 112, 204, 524, 584, 1245,
  1340, 1813, 2227, 5064, 5081, 6885, 6941, 7286, 9621, 11282, 11288, 11701, 16492, 17521,
  18973, 19537, 25073, 44794, 54693, 61400, 72129, 76492, 90633, 234352, 278979, 505710,
  1230360, 1373737, 1183696, 1245577, 1212532, 1048534, 56734, 15774, 3291, 4491, 64, 2524,
  6, 71580, 17605, 15746, 44794, 1372, 3061, 3895, 1331, 1401, 630, 6968, 1065, 14782, 16483,
  13240, 10297, 73457, 62064, 91606, 11288, 517, 11856, 4483, 1269, 3036, 819, 5469, 72466,
  5293, 569, 6949, 4690, 137905, 28846, 1640, 1019, 7499, 114, 109, 1328, 1327, 2387, 3392,
  2232, 1230, 57755, 4756, 18269, 236695, 1315036, 10205, 63, 3136, 955, 204, 1038, 1160,
  4038, 515, 15735, 5309, 7056, 1283, 3063, 1231, 9273, 3489, 108916, 205, 1920, 139, 5344,
  3416, 4430, 12052, 53714, 71070, 59175, 19537, 118545, 501, 1356210, 130640, 56734, 1001657,
  1181313, 1223786, 17286, 1011904, 2230991, 2195140, 206905, 76788, 215055, 206919, 1200864,
  226366, 932967, 135651, 53650, 60898, 6162, 1896, 16851, 117642, 73968, 880, 1893, 17142,
  19274, 21007, 39995, 44735, 62861, 23659, 70851, 55638, 2632, 11108, 55934, 38673, 29222,
  10959, 10989, 10993, 18897, 1336, 10730, 51576, 15111, 23880, 78029, 66, 887, 36422, 4937,
  23532, 58225, 27105, 83586, 17244, 10669, 110, 48, 4491, 14405, 14406, 14407, 14409, 8944,
  2713, 9206, 11863, 21595, 56731, 543261, 8691, 139820, 62561, 1083010, 82104, 9780, 6944,
  40036, 9788, 1735828, 1649152, 2219, 35, 8349, 6952, 2880, 518, 4517, 3094, 16619, 16644,
  921, 820, 418, 650, 689, 690, 655, 3033, 3034, 3035, 3234, 707, 8874, 8872, 67773, 54812,
  519, 11510, 26510
];

// --- ARRAY DI ID PRESI DA GUESS ACTOR ---
const HOLLYWOOD_ACTOR_IDS = [
  134, 17419, 192, 3636, 3295, 6385, 8691, 5081, 11945, 1254, 7467, 13240, 10399, 8325, 3896,
  62, 19292, 3041, 7513, 1019, 7934, 8399, 174, 5064, 5290, 50, 6193, 287, 31, 3223, 5469,
  3085, 1892, 2888, 85, 2380, 8784, 1810, 64, 9780, 2224, 2959, 1336, 2876, 680, 9669, 3995,
  1903, 1230, 29092, 5637, 9016, 64742, 12589, 4517, 4495, 9744, 23659, 10980, 3, 3742, 3932,
  112, 1480, 11701, 21684, 1927, 8167, 2586, 10205, 12952, 9273, 19785, 1785, 7523, 19537,
  14075, 17043, 1327, 45, 2976, 108, 74568, 16828, 73457, 10859, 18918, 1100, 6968, 15358,
  15653, 11288, 12835, 10838, 37221, 2524, 29735, 51329, 10398, 57755, 11159, 44451, 15250,
  22215, 29157, 57461, 1136406, 10990, 8278, 67605, 90633, 1245, 140, 30614, 54693, 72129,
  1373737, 1190668, 24045, 10513, 17694, 224513, 1813, 234352, 32747, 24724, 35193, 73649,
  58786, 3084, 22226, 1532, 976, 1253360, 60073, 51736, 10184, 3061, 5248, 5292, 11086, 54916,
  7482, 36592, 65731, 52548, 1147193, 932967, 1251659, 179, 505710, 82490, 1158982, 71580,
  18999, 56729, 148988, 1185418, 1023483, 1055738, 1097226, 450802, 72384, 26502, 1176880,
  37083, 940983, 1635463, 1465564, 3375244, 1544761, 368524, 1285334, 237584, 1700908, 298413,
  207
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

function getLastWord(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1];
}

async function fetchPerson(id, lang = "en-US") {
  try {
    const res = await axios.get(`${TMDB_BASE}/person/${id}`, {
      params: { api_key: TMDB_API_KEY, language: lang },
      timeout: 6000,
    });
    return res.data;
  } catch (err) {
    console.warn(`[TMDB FAIL] ID ${id}: ${err.message}`);
    return null;
  }
}

async function run() {
  console.log("=== START GENERATING ACTOR POOLS ===");

  const agePool = [];
  const guessPool = [];

  // Dedup all unique IDs across both pools to fetch them efficiently
  const allIds = [...new Set([...CURATED_ACTOR_IDS, ...HOLLYWOOD_ACTOR_IDS])];
  console.log(`Trovati ${allIds.length} ID unici da analizzare.`);

  const actorDetailsMap = new Map();

  let fetchedCount = 0;
  for (const id of allIds) {
    if (!id || id <= 0) continue;
    
    const details = await fetchPerson(id, "en-US");
    if (details) {
      actorDetailsMap.set(id, details);
    }
    
    fetchedCount++;
    if (fetchedCount % 30 === 0) {
      console.log(`Scaricati ${fetchedCount}/${allIds.length} attori...`);
    }
    await sleep(75); // fast rate limit safety
  }

  console.log(`Scaricamento completato! Inizio elaborazione filtri...`);

  // --- AGE GAME POOL PROCESS ---
  // Must satisfy: birthday && !deathday && profile_path && !isExcludedBirthplace(place_of_birth)
  const uniqueAgeIds = [...new Set(CURATED_ACTOR_IDS)];
  for (const id of uniqueAgeIds) {
    const d = actorDetailsMap.get(id);
    if (!d) continue;
    
    const isValid = d.birthday && !d.deathday && d.profile_path && !isExcludedBirthplace(d.place_of_birth);
    if (isValid) {
      agePool.push({
        id: d.id,
        name: d.name,
        profile_path: d.profile_path,
        birthday: d.birthday,
        popularity: d.popularity
      });
    }
  }

  // --- GUESS GAME POOL PROCESS ---
  // Must satisfy: !deathday && profile_path && !isExcludedBirthplace(place_of_birth)
  // Let's check ALL IDs so that guessPool is larger and matches the full curated lists
  for (const id of allIds) {
    const d = actorDetailsMap.get(id);
    if (!d) continue;

    const isValid = !d.deathday && d.profile_path && !isExcludedBirthplace(d.place_of_birth);
    if (isValid) {
      guessPool.push({
        id: d.id,
        name: d.name,
        lastName: getLastWord(d.name),
        profile_path: d.profile_path,
        popularity: d.popularity
      });
    }
  }

  // Ordiniamo guessPool per popolarità decrescente per coerenza con il comportamento dinamico precedente
  guessPool.sort((a, b) => b.popularity - a.popularity);

  // Scrittura dei file JSON
  const dataDir = path.join(__dirname, "../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(path.join(dataDir, "actorAgePool.json"), JSON.stringify(agePool, null, 2));
  fs.writeFileSync(path.join(dataDir, "guessActorPool.json"), JSON.stringify(guessPool, null, 2));

  console.log(`✅ Successo! Generati:`);
  console.log(`   - ${agePool.length} attori validi in actorAgePool.json`);
  console.log(`   - ${guessPool.length} attori validi in guessActorPool.json`);
}

run();
