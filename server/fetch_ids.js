const axios = require("axios");
require("dotenv").config({ path: ".env" });
const API_KEY = process.env.TMDB_API_KEY;

const titles = [
  "Iron Man", "L'incredibile Hulk", "Iron Man 2", "Thor", 
  "Captain America - Il primo Vendicatore", "The Avengers",
  "Iron Man 3", "Thor: The Dark World", "Captain America: The Winter Soldier",
  "Guardiani della Galassia", "Avengers: Age of Ultron", "Ant-Man",
  "Captain America: Civil War", "Doctor Strange", "Guardiani della Galassia Vol. 2",
  "Spider-Man: Homecoming", "Thor: Ragnarok",
  "Black Panther", "Avengers: Infinity War", "Ant-Man and the Wasp", 
  "Captain Marvel", "Avengers: Endgame", "Spider-Man: Far From Home",
  "Black Widow", "Shang-Chi e la leggenda dei Dieci Anelli", "Eternals", 
  "Spider-Man: No Way Home", "Doctor Strange nel Multiverso della Follia", 
  "Thor: Love and Thunder", "Black Panther: Wakanda Forever",
  "Ant-Man and the Wasp: Quantumania", "Guardiani della Galassia Vol. 3", 
  "The Marvels",
  "Deadpool & Wolverine", "Captain America: Brave New World", "Thunderbolts*",
  "The Fantastic Four: First Steps", "Spider-Man: Brand New Day",
  "Avengers: Doomsday", "Avengers: Secret Wars",
  "X-Men", "X-Men 2", "X-Men - Conflitto finale", "X-Men - L'inizio",
  "X-Men - Giorni di un futuro passato", "X-Men: Apocalisse", "X-Men: Dark Phoenix",
  "X-Men le origini - Wolverine", "Wolverine - L'immortale", "Logan - The Wolverine",
  "Deadpool", "Deadpool 2",
  "Spider-Man", "Spider-Man 2", "Spider-Man 3"
];

async function run() {
  const ids = [];
  for (let title of titles) {
    try {
      const res = await axios.get(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(title)}&language=it-IT`);
      if (res.data.results && res.data.results.length > 0) {
        // take first match
        ids.push(res.data.results[0].id);
      }
    } catch (e) {}
  }
  console.log(JSON.stringify(ids));
}
run();
