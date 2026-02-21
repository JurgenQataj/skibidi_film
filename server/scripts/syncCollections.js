require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Review = require('../models/Review');

const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Aggiungiamo il campo temporaneamente al volo nello script
const movieSchema = Movie.schema;
if (!movieSchema.paths.collection_info) {
  movieSchema.add({
    collection_info: { id: Number, name: String, poster_path: String, backdrop_path: String }
  });
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('DB Connesso');

    // 1. Aggiorniamo info collezione per tutti i film recensiti dall'utente
    // Troviamo il primo utente (che è il nostro unico utente)
    const user = await User.findOne();
    if (!user) {
      console.log('Nessun utente trovato.');
      process.exit(0);
    }
    const userId = user._id;

    const reviews = await Review.find({ user: userId }).populate('movie');
    console.log(`Trovate ${reviews.length} recensioni per l'utente ${user.username}`);

    const collectionMap = new Map(); // collection_id -> array of movie_ids

    for (const r of reviews) {
      const movie = r.movie;
      if (!movie) continue;

      if (movie.collection_info === undefined) {
        // Fetch from TMDB
        try {
          const res = await axios.get(`https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${TMDB_API_KEY}&language=it-IT`);
          const coll = res.data.belongs_to_collection;
          movie.collection_info = coll ? {
            id: coll.id, name: coll.name, poster_path: coll.poster_path, backdrop_path: coll.backdrop_path
          } : null;
          await movie.save();
          console.log(`Film ${movie.title} aggiornato con info collezione.`);
        } catch (err) {
          console.log(`Errore fetch TMDB per ${movie.tmdb_id}`);
        }
      }

      if (movie.collection_info && movie.collection_info.id) {
        const cid = movie.collection_info.id;
        if (!collectionMap.has(cid)) {
          collectionMap.set(cid, {
            id: cid,
            name: movie.collection_info.name,
            poster_path: movie.collection_info.poster_path,
            reviewedMovies: new Set()
          });
        }
        collectionMap.get(cid).reviewedMovies.add(movie.tmdb_id);
      }
    }

    const completed = [];

    // 2. Controllo per ogni collezione
    for (const [cid, collData] of collectionMap.entries()) {
      try {
        const res = await axios.get(`https://api.themoviedb.org/3/collection/${cid}?api_key=${TMDB_API_KEY}&language=it-IT`);
        // Filtriamo i film già usciti
        const parts = res.data.parts.filter(p => p.release_date && new Date(p.release_date) <= new Date());
        const totalRequired = parts.length;
        
        let foundCount = 0;
        for (const p of parts) {
          if (collData.reviewedMovies.has(p.id)) foundCount++;
        }

        console.log(`Collezione: ${collData.name} - Visti: ${foundCount}/${totalRequired}`);

        if (foundCount === totalRequired && totalRequired > 1) {
          completed.push({
            id: collData.id,
            name: collData.name,
            poster_path: collData.poster_path
          });
        }
      } catch (e) {
        console.error(`Errore collezione ${cid}`);
      }
    }

    user.completedCollections = completed;
    await user.save();
    console.log(`Badge aggiornati! L'utente ha ${completed.length} collezioni completate.`);

    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
