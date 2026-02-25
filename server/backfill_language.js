require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Movie = require("./models/Movie");

const API_KEY = process.env.TMDB_API_KEY;

// Map TMDB language codes to human-readable names
const LANGUAGE_NAMES = {
  en: "English", fr: "French", it: "Italian", de: "German", es: "Spanish",
  ja: "Japanese", ko: "Korean", zh: "Chinese", pt: "Portuguese",
  ru: "Russian", hi: "Hindi", ar: "Arabic", nl: "Dutch", sv: "Swedish",
  da: "Danish", fi: "Finnish", nb: "Norwegian", tr: "Turkish", pl: "Polish",
  cs: "Czech", hu: "Hungarian", ro: "Romanian", el: "Greek", he: "Hebrew",
  th: "Thai", id: "Indonesian", vi: "Vietnamese", uk: "Ukrainian",
  cn: "Cantonese", fa: "Persian", sr: "Serbian",
};

async function backfillLanguage() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB.");

  const movies = await Movie.find({ original_language: { $exists: false } });
  console.log(`Trovati ${movies.length} film da aggiornare con lingua originale.`);

  let count = 0;
  for (const doc of movies) {
    try {
      const endpoint = doc.media_type === "tv"
        ? `https://api.themoviedb.org/3/tv/${doc.tmdb_id}?api_key=${API_KEY}`
        : `https://api.themoviedb.org/3/movie/${doc.tmdb_id}?api_key=${API_KEY}`;
      const resp = await axios.get(endpoint);
      const data = resp.data;
      const langCode = data.original_language || null;
      doc.original_language = langCode;
      await doc.save();
      count++;
      if (count % 30 === 0) console.log(`Aggiornati ${count} film...`);
      await new Promise(r => setTimeout(r, 50));
    } catch (e) {
      if (e.response && e.response.status === 404) {
        doc.original_language = null;
        await doc.save();
      } else {
        console.error(`Errore su tmdb_id ${doc.tmdb_id}: ${e.message}`);
      }
    }
  }
  console.log(`Fine aggiornamento lingua (totale: ${count}).`);
  process.exit(0);
}

backfillLanguage();
