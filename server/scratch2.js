const axios = require('axios');
require('dotenv').config();

const API_KEY = process.env.TMDB_API_KEY;

// List of ~100+ keywords
const keywordsToSearch = [
  "alien", "zombie", "post-apocalyptic", "serial killer", "time travel", 
  "dystopia", "superhero", "magic", "vampire", "robot", 
  "artificial intelligence", "space", "cyberpunk", "ghost", 
  "murder", "sequel", "based on novel", "violence", "love", "revenge", "mafia",
  "monster", "survival", "space travel", "future", "war", "assassin",
  "witch", "demon", "dragon", "prison", "kidnapping", "heist", "spy",
  "martial arts", "supernatural", "steampunk", "virtual reality",
  "clone", "mutant", "ninja", "samurai", "yakuza", "gangster",
  "heist", "conspiracy", "corruption", "detective", "police", "fbi",
  "cia", "terrorism", "hostage", "sniper", "hitman", "cartel",
  "drug dealer", "undercover", "prison escape", "bank robbery",
  "treasure hunt", "exploration", "survival horror", "found footage",
  "slasher", "haunted house", "possession", "exorcism", "curse",
  "serial killer", "psychopath", "amnesia", "schizophrenia",
  "hallucination", "paranoia", "dream", "nightmare", "parallel universe",
  "time loop", "alternate history", "space opera", "alien invasion",
  "first contact", "astronaut", "spaceship", "black hole",
  "mars", "moon", "post-apocalyptic", "pandemic", "virus", "infection",
  "natural disaster", "earthquake", "tsunami", "volcano", "tornado",
  "meteor", "end of the world", "doomsday", "dinosaur", "kaiju",
  "giant monster", "mecha", "cyborg", "android", "hacker",
  "dark web", "cybercrime", "artificial intelligence", "virtual reality",
  "simulation", "mind control", "telepathy", "telekinesis",
  "super power", "origin story", "comic book", "based on comic",
  "based on true story", "biography", "historical figure",
  "world war ii", "vietnam war", "cold war", "civil war",
  "medieval", "ancient rome", "ancient greece", "egypt",
  "mythology", "fairy tale", "fantasy world", "magic", "wizard",
  "elf", "orc", "goblin", "dwarf", "knight", "princess",
  "king", "queen", "empire", "rebellion", "revolution",
  "dictator", "gladiator", "samurai", "ninja", "pirate",
  "cowboy", "wild west", "outlaw", "sheriff", "bounty hunter",
  "road trip", "coming of age", "high school", "college",
  "wedding", "divorce", "family", "friendship", "romance",
  "love triangle", "forbidden love", "soulmates", "ghost",
  "spirit", "afterlife", "reincarnation", "heaven", "hell",
  "angel", "demon", "devil", "god", "religion", "cult"
];

async function run() {
  const uniqueKeywords = [...new Set(keywordsToSearch)];
  const results = [];
  const seenIds = new Set();
  
  for (const k of uniqueKeywords) {
    try {
      const res = await axios.get(`https://api.themoviedb.org/3/search/keyword?api_key=${API_KEY}&query=${encodeURIComponent(k)}&page=1`);
      if (res.data.results && res.data.results.length > 0) {
        // Find best match
        let match = res.data.results.find(r => r.name.toLowerCase() === k.toLowerCase()) || res.data.results[0];
        
        if (!seenIds.has(match.id)) {
          seenIds.add(match.id);
          results.push(match);
        }
      }
    } catch (e) {
      console.error("Error for", k, e.message);
    }
  }
  console.log(JSON.stringify(results, null, 2));
}
run();
