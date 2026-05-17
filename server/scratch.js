const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.TMDB_API_KEY;
const keywordsToSearch = [
  "alien", "zombie", "post-apocalyptic", "serial killer", "time travel", 
  "dystopia", "superhero", "magic", "vampire", "robot", 
  "artificial intelligence", "space", "cyberpunk", "ghost", 
  "murder", "sequel", "based on novel", "violence", "love", "revenge", "mafia",
  "monster", "survival", "space travel", "future", "war", "assassin",
  "witch", "demon", "dragon", "prison", "kidnapping", "heist", "spy"
];

async function run() {
  const results = [];
  for (const k of keywordsToSearch) {
    try {
      const res = await axios.get(`https://api.themoviedb.org/3/search/keyword?api_key=${API_KEY}&query=${encodeURIComponent(k)}&page=1`);
      if (res.data.results && res.data.results.length > 0) {
        // take exact match or first match
        const match = res.data.results.find(r => r.name.toLowerCase() === k.toLowerCase()) || res.data.results[0];
        results.push(match);
      }
    } catch (e) {
      console.error("Error for", k, e.message);
    }
  }
  console.log(JSON.stringify(results, null, 2));
}
run();
