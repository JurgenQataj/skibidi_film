const axios = require("axios");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });

async function run() {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const OMDB_API_KEY = process.env.OMDB_API_KEY;

  // Let's search for "Tre colori - Film rosso" on TMDB to find its ID
  const searchRes = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent("Tre colori - Film rosso")}&language=it-IT`);
  const movie = searchRes.data.results[0];
  console.log("TMDB Movie:", movie.title, movie.id);

  const tmdbRes = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}/external_ids?api_key=${TMDB_API_KEY}`);
  const imdbId = tmdbRes.data.imdb_id;
  console.log("IMDb ID:", imdbId);
  
  const omdbRes = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`);
  console.log("OMDb Ratings:", omdbRes.data.Ratings);
}
run();
