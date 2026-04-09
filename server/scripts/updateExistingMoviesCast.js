const mongoose = require("mongoose");
require("dotenv").config({ path: "../.env" });
const axios = require("axios");
const Movie = require("../models/Movie");
const connectDB = require("../config/database");

const API_KEY = process.env.TMDB_API_KEY;

async function run() {
  await connectDB();
  
  const movies = await Movie.find({});
  console.log(`Trovati ${movies.length} film da controllare...`);

  let updated = 0;
  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    
    // Attendi 40ms per evitare il rate limit di TMDB (~50 req/sec max)
    await new Promise(r => setTimeout(r, 40));
    
    try {
      const typeStr = movie.media_type === "tv" ? "tv" : "movie";
      const tmdbUrl = `https://api.themoviedb.org/3/${typeStr}/${movie.tmdb_id}?api_key=${API_KEY}&language=it-IT&append_to_response=credits`;
      
      const response = await axios.get(tmdbUrl);
      const data = response.data;
      
      const cast = data.credits?.cast?.slice(0, 100).map(c => c.name) || [];
      
      // Se abbiamo trovato attori in più rispetto a quelli salvati prima, aggiorniamo il record.
      // (Es. il cast salvato è di 5 attori e ora ne troviamo 18).
      if (cast.length > (movie.cast ? movie.cast.length : 0)) {
         await Movie.findByIdAndUpdate(movie._id, { cast: cast });
         updated++;
         if (updated % 10 === 0) {
            console.log(`Aggiornati ${updated} film finora... ultimo: ${movie.title}`);
         }
      }
    } catch (err) {
      if (err.response && err.response.status === 404) {
         // Film o serie rimosso da TMDB
      } else {
         console.error(`Errore con l'ID TMDB ${movie.tmdb_id}: ${err.message}`);
      }
    }
  }
  
  console.log(`Completato! Sono stati aggiornati con successo i cast di ${updated} film.`);
  process.exit(0);
}

run();
