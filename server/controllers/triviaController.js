const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

const GENRE_MAP = {
  28: "Azione", 12: "Avventura", 16: "Animazione", 35: "Commedia",
  80: "Crime", 99: "Documentario", 18: "Dramma", 10751: "Famiglia",
  14: "Fantasy", 36: "Storia", 27: "Horror", 9648: "Mistero",
  10749: "Romantico", 878: "Fantascienza", 53: "Thriller",
  10752: "Guerra", 37: "Western", 10402: "Musica", 10770: "TV Movie",
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, n);
}

// Fetch movie details (director + lead cast) for a list of movie IDs (parallel, batched)
async function fetchDetails(movieIds) {
  const results = await Promise.all(
    movieIds.map(async (id) => {
      try {
        const r = await axios.get(
          `${BASE_URL}/movie/${id}?api_key=${API_KEY}&language=it-IT&append_to_response=credits`
        );
        const d = r.data;
        const director = d.credits?.crew?.find((c) => c.job === "Director")?.name || null;
        const leadActor = d.credits?.cast?.[0]?.name || null;
        const genres = (d.genre_ids || d.genres?.map((g) => g.id) || [])
          .map((gid) => GENRE_MAP[gid])
          .filter(Boolean);
        const year = d.release_date ? parseInt(d.release_date.slice(0, 4)) : null;
        return {
          id: d.id,
          title: d.title,
          poster_path: d.poster_path,
          director,
          leadActor,
          genres,
          year,
        };
      } catch (_) {
        return null;
      }
    })
  );
  return results.filter(Boolean);
}

exports.getTriviaQuestions = async (req, res) => {
  try {
    if (!API_KEY) {
      return res.status(500).json({ message: "TMDB API key not configured." });
    }

    // 1. Fetch 4 pages of popular movies for a large pool
    const pages = await Promise.all(
      [1, 2, 3, 4].map((p) =>
        axios.get(`${BASE_URL}/movie/popular?api_key=${API_KEY}&language=it-IT&page=${p}`)
          .then((r) => r.data.results || [])
          .catch(() => [])
      )
    );
    const pool = pages.flat().filter((m) => m.poster_path);

    if (pool.length < 15) {
      return res.status(500).json({ message: "Non abbastanza film disponibili." });
    }

    // 2. Pick 20 random movies and fetch their full details
    const sampled = pickRandom(pool, 20);
    const detailed = await fetchDetails(sampled.map((m) => m.id));

    // Only keep movies with enough info for at least one question type
    const usable = detailed.filter(
      (m) => m.poster_path && (m.director || m.leadActor || m.year || m.genres.length > 0)
    );

    if (usable.length < 10) {
      return res.status(500).json({ message: "Film insufficienti per generare domande." });
    }

    // 3. Pick 10 subjects and build questions
    const subjects = pickRandom(usable, 10);
    const questions = [];

    for (const movie of subjects) {
      // Determine which question types are valid for this movie
      const types = [];
      if (movie.director) types.push("director");
      if (movie.leadActor) types.push("actor");
      if (movie.year) types.push("year");
      if (movie.genres.length > 0) types.push("genre");

      const type = types[Math.floor(Math.random() * types.length)];

      let questionText, correctAnswer, wrongAnswers;

      // Build distractors from other movies in the usable pool
      const others = usable.filter((m) => m.id !== movie.id);

      if (type === "director") {
        questionText = `🎬 Chi ha diretto "${movie.title}"?`;
        correctAnswer = movie.director;
        const pool2 = shuffle(others.map((m) => m.director).filter((d) => d && d !== correctAnswer));
        wrongAnswers = pickRandom([...new Set(pool2)], 3);
      } else if (type === "actor") {
        questionText = `🎭 Chi è il protagonista principale di "${movie.title}"?`;
        correctAnswer = movie.leadActor;
        const pool2 = shuffle(others.map((m) => m.leadActor).filter((a) => a && a !== correctAnswer));
        wrongAnswers = pickRandom([...new Set(pool2)], 3);
      } else if (type === "year") {
        questionText = `📅 In che anno è uscito "${movie.title}"?`;
        correctAnswer = String(movie.year);
        // Generate plausible wrong years near the real one
        const delta = [-2, -1, 1, 2, 3, -3, 4, -4, 5, -5];
        const candidates = shuffle(delta.map((d) => String(movie.year + d)).filter((y) => y !== correctAnswer));
        wrongAnswers = candidates.slice(0, 3);
      } else {
        // genre
        const correctGenre = movie.genres[Math.floor(Math.random() * movie.genres.length)];
        questionText = `🎭 A quale genere appartiene "${movie.title}"?`;
        correctAnswer = correctGenre;
        const allGenres = Object.values(GENRE_MAP).filter((g) => g !== correctGenre);
        wrongAnswers = pickRandom(allGenres, 3);
      }

      // Pad wrongAnswers if not enough distractors
      while (wrongAnswers.length < 3) wrongAnswers.push("Sconosciuto");

      const options = shuffle([correctAnswer, ...wrongAnswers.slice(0, 3)]);
      const correctIndex = options.indexOf(correctAnswer);

      questions.push({
        movieId: movie.id,
        movieTitle: movie.title,
        posterPath: movie.poster_path,
        type,
        questionText,
        options,
        correctIndex,
      });
    }

    res.json({ questions });
  } catch (error) {
    console.error("Errore getTriviaQuestions:", error.message);
    res.status(500).json({ message: "Errore del server nel generare la trivia." });
  }
};
