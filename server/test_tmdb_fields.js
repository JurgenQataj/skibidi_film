require("dotenv").config();
const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const PERSON_ID = "138"; // Quentin Tarantino (known for having acting and directing)

async function testCredits() {
  try {
    const url = `https://api.themoviedb.org/3/person/${PERSON_ID}/movie_credits?api_key=${API_KEY}&language=it-IT`;
    console.log("Fetching:", url);
    const res = await axios.get(url);
    
    if (res.data.cast && res.data.cast.length > 0) {
      console.log("Example Cast Item Keys:", Object.keys(res.data.cast[0]));
      console.log("Example Cast Item:", JSON.stringify(res.data.cast[0], null, 2));
    }
    
    if (res.data.crew && res.data.crew.length > 0) {
        console.log("Example Crew Item Keys:", Object.keys(res.data.crew[0]));
    }

  } catch (error) {
    console.error("Error:", error.message);
  }
}

testCredits();
