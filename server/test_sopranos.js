const axios = require("axios");
require("dotenv").config({ path: "/Users/jurgen126q/Desktop/skibidi/server/.env" });

async function run() {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const OMDB_API_KEY = process.env.OMDB_API_KEY;

  const tmdbRes = await axios.get(`https://api.themoviedb.org/3/tv/1398/external_ids?api_key=${TMDB_API_KEY}`);
  const imdbId = tmdbRes.data.imdb_id;
  console.log("IMDb ID:", imdbId);
  
  const omdbRes = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}`);
  console.log("OMDb Ratings:", omdbRes.data.Ratings);
}
run();
