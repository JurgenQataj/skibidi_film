const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

// ────────────────────────────────────────────────────────────────
//  DIZIONARI ESTESI
// ────────────────────────────────────────────────────────────────

// Tutte le varianti → genre IDs (OR tra generi)
const KEYWORD_TO_GENRES = {
  // Generi diretti (italiano e inglese)
  azione:         [28],
  "d'azione":     [28],
  "di azione":    [28],
  action:         [28],
  avventura:      [12],
  avventuroso:    [12, 28],
  "d'avventura":  [12],
  animazione:     [16],
  anime:          [16],
  cartone:        [16],
  cartoni:        [16],
  commedia:       [35],
  comico:         [35],
  divertente:     [35],
  comedy:         [35],
  crime:          [80],
  crimine:        [80],
  gangster:       [80],
  noir:           [80, 53],
  documentario:   [99],
  docufilm:       [99],
  dramma:         [18],
  drammatico:     [18],
  drama:          [18],
  famiglia:       [10751],
  familiare:      [10751],
  bambini:        [10751],
  fantascienza:   [878],
  "sci-fi":       [878],
  "sci fi":       [878],
  spazio:         [878],
  fantascientifico: [878],
  fantasy:        [14],
  magico:         [14],
  magia:          [14],
  guerra:         [10752],
  bellico:        [10752],
  horror:         [27],
  spaventoso:     [27],
  paura:          [27],
  "dell'orrore":  [27],
  angosciante:    [27, 53],
  mistero:        [9648],
  misterioso:     [9648],
  giallo:         [9648, 80],
  musica:         [10402],
  musicale:       [10402],
  romance:        [10749],
  romantico:      [10749],
  romantica:      [10749],
  amore:          [10749, 18],
  sentimentale:   [10749, 18],
  storia:         [36],
  storico:        [36],
  storica:        [36],
  fiction:        [36],
  thriller:       [53],
  suspense:       [53],
  western:        [37],
  // Mood / emozioni → genere
  emozionante:    [18, 53],
  commovente:     [18],
  toccante:       [18],
  triste:         [18],
  malinconico:    [18],
  intenso:        [18, 53],
  adrenalinico:   [28, 12],
  spettacolare:   [28, 878, 12],
};

// Ordinamento dalla frase
const SORT_KEYWORDS = {
  "più popolari":    "popularity.desc",
  "piu popolari":    "popularity.desc",
  "popolare":        "popularity.desc",
  "popolari":        "popularity.desc",
  "più famosi":      "popularity.desc",
  "piu famosi":      "popularity.desc",
  "di tendenza":     "popularity.desc",
  "trend":           "popularity.desc",
  "più votati":      "vote_average.desc",
  "piu votati":      "vote_average.desc",
  "più belli":       "vote_average.desc",
  "piu belli":       "vote_average.desc",
  "meglio votati":   "vote_average.desc",
  "top rated":       "vote_average.desc",
  "capolavoro":      "vote_average.desc",
  "più recenti":     "release_date.desc",
  "piu recenti":     "release_date.desc",
  "nuovi":           "release_date.desc",
  "nuove":           "release_date.desc",
  "più vecchi":      "release_date.asc",
  "piu vecchi":      "release_date.asc",
  "più visti":       "popularity.desc",
  "piu visti":       "popularity.desc",
};

// Qualità → voto minimo
const QUALITY_WORDS = {
  capolavoro:   8.0,
  eccellente:   7.8,
  ottimo:       7.5,
  "ben votato": 7.5,
  premiato:     7.5,
  classico:     7.0,
};

// Lingua
const LANGUAGE_MAP = {
  italiano:   "it",
  italiana:   "it",
  italiani:   "it",
  "in italiano": "it",
  inglese:    "en",
  "in inglese": "en",
  americano:  "en",
  francese:   "fr",
  "in francese": "fr",
  spagnolo:   "es",
  "in spagnolo": "es",
  tedesco:    "de",
  giapponese: "ja",
  giapponesi: "ja",
  "in giapponese": "ja",
  coreano:    "ko",
  "in coreano": "ko",
  cinese:     "zh",
  "in cinese": "zh",
};

// Decenni testuali e numerici
const DECADE_MAP = [
  { words: ["anni venti", "anni '20", "anni 20"], from: 1920, to: 1929 },
  { words: ["anni trenta", "anni '30", "anni 30"], from: 1930, to: 1939 },
  { words: ["anni quaranta", "anni '40", "anni 40"], from: 1940, to: 1949 },
  { words: ["anni cinquanta", "anni '50", "anni 50"], from: 1950, to: 1959 },
  { words: ["anni sessanta", "anni '60", "anni 60"], from: 1960, to: 1969 },
  { words: ["anni settanta", "anni '70", "anni 70"], from: 1970, to: 1979 },
  { words: ["anni ottanta", "anni '80", "anni 80"], from: 1980, to: 1989 },
  { words: ["anni novanta", "anni '90", "anni 90"], from: 1990, to: 1999 },
  { words: ["anni duemila", "anni 2000", "anni '00", "anni 00", "2000s"], from: 2000, to: 2009 },
  { words: ["anni dieci", "anni 2010", "anni '10", "anni 10", "2010s"], from: 2010, to: 2019 },
  { words: ["anni venti del 2000", "anni 2020", "anni '20 del 2000", "anni 20 del 2000", "2020s"], from: 2020, to: 2029 },
];

const GENRE_NAMES = {
  16: "Animazione", 12: "Avventura", 28: "Azione", 35: "Commedia",
  80: "Crime", 99: "Documentario", 18: "Dramma", 10751: "Famiglia",
  878: "Fantascienza", 14: "Fantasy", 10752: "Guerra", 27: "Horror",
  9648: "Mistero", 10402: "Musica", 10749: "Romance", 36: "Storia",
  53: "Thriller", 37: "Western",
};

// ────────────────────────────────────────────────────────────────
//  HELPER: normalizza apostrofi e testo
// ────────────────────────────────────────────────────────────────
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[''`]/g, "'")      // normalizza apostrofi
    .replace(/[àáâä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôö]/g, "o")
    .replace(/[ùúûü]/g, "u");
}

// ────────────────────────────────────────────────────────────────
//  PARSER PRINCIPALE
// ────────────────────────────────────────────────────────────────
function parseQuery(text) {
  const lower = normalize(text);

  const result = {
    personCandidates: [],   // stringhe candidate come nome persona
    genreIds: [],
    minRating: 0,
    language: null,
    yearFrom: null,
    yearTo: null,
    sortBy: "popularity.desc",  // default
    mediaType: "movie",
    rawText: text,
    sortExplicit: false,        // se l'utente ha esplicitamente chiesto un ordinamento
  };

  // 1. Tipo di media
  if (/\b(serie\s*tv|telefilm|show|sitcom)\b/.test(lower)) result.mediaType = "tv";
  else if (/\b(film|cinema|pellicola|movie)\b/.test(lower)) result.mediaType = "movie";

  // 2. Ordinamento (scelto esplicitamente → sovrascrive default)
  for (const [phrase, sort] of Object.entries(SORT_KEYWORDS)) {
    if (lower.includes(phrase)) {
      result.sortBy = sort;
      result.sortExplicit = true;
      break;
    }
  }

  // 3. Generi da keyword map (tutti i match trovati)
  const foundGenreIds = new Set();
  for (const [word, ids] of Object.entries(KEYWORD_TO_GENRES)) {
    if (lower.includes(word)) ids.forEach((id) => foundGenreIds.add(id));
  }
  result.genreIds = [...foundGenreIds];

  // 4. Qualità / voto minimo
  for (const [word, rating] of Object.entries(QUALITY_WORDS)) {
    if (lower.includes(word)) result.minRating = Math.max(result.minRating, rating);
  }

  // 5. Lingua
  for (const [word, code] of Object.entries(LANGUAGE_MAP)) {
    if (lower.includes(word)) { result.language = code; break; }
  }

  // 6. Decenni — usa match con word-boundary per evitare che "anni 20" 
  //    venga trovato dentro "anni 2010", "anni 2000", ecc.
  function matchesDecadeWord(text, word) {
    const w = normalize(word);
    let startIdx = 0;
    while (true) {
      const idx = text.indexOf(w, startIdx);
      if (idx < 0) return false;
      const after = text[idx + w.length];
      // Se la parola termina con una cifra, il char successivo NON deve essere una cifra
      if (/\d$/.test(w) && after && /\d/.test(after)) {
        startIdx = idx + 1; // prova posizione successiva
        continue;
      }
      return true;
    }
  }

  let foundDecade = false;
  // Processa prima le entry con parole più lunghe (più specifiche) per evitare match parziali
  const sortedDecades = [...DECADE_MAP].sort(
    (a, b) => Math.max(...b.words.map((w) => w.length)) - Math.max(...a.words.map((w) => w.length))
  );
  for (const decade of sortedDecades) {
    for (const w of decade.words) {
      if (matchesDecadeWord(lower, w)) {
        result.yearFrom = decade.from;
        result.yearTo = decade.to;
        foundDecade = true;
        break;
      }
    }
    if (foundDecade) break;
  }

  // Anni con pattern "del XXXX", "nel XXXX" o anno grezzo a 4 cifre
  if (!foundDecade) {
    const yearExplicit = lower.match(/(?:del|nel|del|anno|intorno al|nel|circa il)\s+(1[89]\d{2}|20[012]\d)/);
    if (yearExplicit) {
      const y = parseInt(yearExplicit[1]);
      result.yearFrom = y;
      result.yearTo = y;
    } else {
      const rawYear = lower.match(/\b(1[89]\d{2}|20[012]\d)\b/);
      if (rawYear) {
        const y = parseInt(rawYear[1]);
        result.yearFrom = y;
        result.yearTo = y;
      }
    }
  }

  // 7. Estrai nomi di persone (molto più flessibile)
  // Pattern A: "con NOME", "regia di NOME", "diretto da NOME", "interpretato da NOME", "starring NOME", "di NOME"
  // Rendiamo CASE-INSENSITIVE e accettiamo particelle ("di", "de", "del", "van", "von", "le", "la")
  const PARTICLES = new Set(["di", "de", "del", "della", "van", "von", "le", "la", "el", "da", "dos", "du", "lo"]);

  const personPrefixPatterns = [
    /\bcon\s+(.{3,40}?)(?:\s+(?:in|il|la|e\s|nel|del|degli|che)\b|$)/gi,
    /\bregia\s+di\s+(.{3,40}?)(?:\s+(?:in|il|la|e\s|nel|del)\b|$)/gi,
    /\bdiretto\s+da\s+(.{3,40}?)(?:\s+(?:in|il|la|e\s|nel|del)\b|$)/gi,
    /\binterpretato\s+da\s+(.{3,40}?)(?:\s+(?:in|il|la|e\s|nel|del)\b|$)/gi,
    /\bprotagonista\s+(.{3,40}?)(?:\s+(?:in|il|la|e\s|nel|del)\b|$)/gi,
    /\bstars?\s+(.{3,40}?)(?:\s+(?:in|il|la|e\s|nel|del)\b|$)/gi,
    /\bfeaturin[g]?\s+(.{3,40}?)(?:\s+(?:in|il|la|e\s|nel|del)\b|$)/gi,
  ];

  const rawPersonCandidates = new Set();
  for (const pattern of personPrefixPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1].trim().replace(/[,;.!?].*$/, ""); // tronca a punteggiatura
      if (raw.length >= 3 && raw.split(/\s+/).length >= 1) {
        rawPersonCandidates.add(raw);
      }
    }
  }

  // Anche match case-insensitive nella versione normalizzata
  for (const pattern of personPrefixPatterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const raw = match[1].trim().replace(/[,;.!?].*$/, "");
      // Riconverti a titolo case
      const titled = raw.split(/\s+/).map((w) =>
        PARTICLES.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
      ).join(" ");
      if (titled.length >= 3) rawPersonCandidates.add(titled);
    }
  }

  result.personCandidates = [...rawPersonCandidates];
  return result;
}

// ────────────────────────────────────────────────────────────────
//  RISOLVI PERSONE SU TMDB (con tolleranza agli errori)
// ────────────────────────────────────────────────────────────────
async function resolvePersonIds(candidates) {
  const resolved = [];
  const seen = new Set();

  for (const candidate of candidates) {
    if (seen.has(candidate.toLowerCase())) continue;
    seen.add(candidate.toLowerCase());

    try {
      const res = await axios.get(`${BASE_URL}/search/person`, {
        params: { api_key: API_KEY, query: candidate, language: "it-IT" },
      });
      const person = res.data.results?.[0];
      // Accetta solo se la popolarità è ragionevole (evita false corrispondenze)
      if (person && person.popularity > 0.5) {
        resolved.push({ name: person.name, id: person.id, popularity: person.popularity });
      }
    } catch (_) {}
  }

  // Ordina per popolarità e prendi i top 3
  return resolved.sort((a, b) => b.popularity - a.popularity).slice(0, 3);
}

// ────────────────────────────────────────────────────────────────
//  BUILD EXPLANATION
// ────────────────────────────────────────────────────────────────
const SORT_LABELS = {
  "popularity.desc":    "Più popolari",
  "popularity.asc":     "Meno popolari",
  "vote_average.desc":  "Più votati",
  "vote_average.asc":   "Meno votati",
  "release_date.desc":  "Più recenti",
  "release_date.asc":   "Più vecchi",
};

const LANG_NAMES = {
  it: "Italiano", en: "Inglese", fr: "Francese", es: "Spagnolo",
  de: "Tedesco", ja: "Giapponese", ko: "Coreano", zh: "Cinese",
};

function buildExplanation(parsed, resolvedPersons) {
  const parts = [];
  if (parsed.sortExplicit) parts.push(SORT_LABELS[parsed.sortBy] || "");
  if (parsed.mediaType === "tv") parts.push("Serie TV");
  else parts.push("Film");
  const genreNames = [...new Set(parsed.genreIds)].map((id) => GENRE_NAMES[id]).filter(Boolean);
  if (genreNames.length > 0) parts.push(genreNames.join(" / "));
  if (resolvedPersons.length > 0) parts.push("con " + resolvedPersons.map((p) => p.name).join(", "));
  if (parsed.yearFrom && parsed.yearTo && parsed.yearFrom !== parsed.yearTo) {
    parts.push(`Anni ${String(parsed.yearFrom).slice(-2)}'`);
  } else if (parsed.yearFrom) {
    parts.push(`Anno ${parsed.yearFrom}`);
  }
  if (parsed.minRating > 0) parts.push(`Voto ≥ ${parsed.minRating}`);
  if (parsed.language) parts.push(LANG_NAMES[parsed.language] || parsed.language);
  return parts.filter(Boolean).join(" · ");
}

// ────────────────────────────────────────────────────────────────
//  CONTROLLER
// ────────────────────────────────────────────────────────────────
exports.smartSearch = async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ message: "Query troppo corta." });
    }

    const parsed = parseQuery(q);
    console.log("[SMART SEARCH] Parsed:", JSON.stringify(parsed, null, 2));

    // Risolvi nomi persone → ID TMDB in parallelo
    const resolvedPersons = await resolvePersonIds(parsed.personCandidates);
    console.log("[SMART SEARCH] Persons resolved:", resolvedPersons.map((p) => p.name));

    const endpointType = parsed.mediaType === "tv" ? "tv" : "movie";

    // Costruisci params TMDB Discover
    const params = {
      api_key: API_KEY,
      language: "it-IT",
      sort_by: parsed.sortBy,
      "vote_count.gte": resolvedPersons.length > 0 ? 50 : 100, // Più tollerante con attori specifici
      page,
    };

    if (parsed.genreIds.length > 0) {
      // Usa pipe | per OR tra generi (così "emozionante" → Dramma OPPURE Thriller)
      params.with_genres = [...new Set(parsed.genreIds)].slice(0, 2).join("|");
    }

    if (resolvedPersons.length > 0) {
      if (parsed.mediaType === "movie") {
        params.with_cast = resolvedPersons.map((p) => p.id).join(",");
      } else {
        // TV: usa with_people (include sia cast che crew)
        params.with_people = resolvedPersons.map((p) => p.id).join(",");
      }
    }

    if (parsed.yearFrom) {
      const dateField = parsed.mediaType === "tv" ? "first_air_date" : "primary_release_date";
      params[`${dateField}.gte`] = `${parsed.yearFrom}-01-01`;
      params[`${dateField}.lte`] = `${parsed.yearTo || parsed.yearFrom}-12-31`;
    }

    if (parsed.minRating > 0) params["vote_average.gte"] = parsed.minRating;
    if (parsed.language) params.with_original_language = parsed.language;

    const hasAnyFilter =
      parsed.genreIds.length > 0 ||
      resolvedPersons.length > 0 ||
      parsed.yearFrom ||
      parsed.minRating > 0 ||
      parsed.language;

    let results = [];
    let totalPages = 1;

    if (hasAnyFilter) {
      const discoverRes = await axios.get(`${BASE_URL}/discover/${endpointType}`, { params });
      results = discoverRes.data.results || [];
      totalPages = discoverRes.data.total_pages || 1;

      // Se abbiamo un attore ma 0 risultati con genere → riprova senza genere
      if (results.length === 0 && resolvedPersons.length > 0 && parsed.genreIds.length > 0) {
        console.log("[SMART SEARCH] Retry without genre filter...");
        const fallbackParams = { ...params };
        delete fallbackParams.with_genres;
        const fallbackRes = await axios.get(`${BASE_URL}/discover/${endpointType}`, { params: fallbackParams });
        results = fallbackRes.data.results || [];
        totalPages = fallbackRes.data.total_pages || 1;
      }
    } else {
      // Nessun filtro riconosciuto → cerca per titolo
      const searchRes = await axios.get(`${BASE_URL}/search/${endpointType}`, {
        params: { api_key: API_KEY, language: "it-IT", query: q, page },
      });
      results = searchRes.data.results || [];
      totalPages = searchRes.data.total_pages || 1;
    }

    const explanation = buildExplanation(parsed, resolvedPersons);

    res.json({
      results,
      total_pages: totalPages,
      page: parseInt(page),
      explanation,
      parsed: {
        genres: [...new Set(parsed.genreIds)].map((id) => ({ id, name: GENRE_NAMES[id] })).filter((g) => g.name),
        persons: resolvedPersons,
        year: parsed.yearFrom ? { from: parsed.yearFrom, to: parsed.yearTo } : null,
        language: parsed.language,
        mediaType: parsed.mediaType,
        minRating: parsed.minRating,
        sortBy: parsed.sortBy,
        sortLabel: SORT_LABELS[parsed.sortBy] || null,
      },
    });
  } catch (error) {
    console.error("[SMART SEARCH] Error:", error.message);
    res.status(500).json({ message: "Errore durante la ricerca intelligente." });
  }
};
