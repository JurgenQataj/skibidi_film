require("dotenv").config();
const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

async function testEndpoint(endpoint, region = null) {
  try {
    let url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&language=it-IT&page=1`;
    if (region) {
      url += `&region=${region}`;
    }
    const response = await axios.get(url);
    const dates = response.data.dates;
    const firstFive = response.data.results.slice(0, 3).map(m => `${m.title} (${m.release_date})`);
    console.log(`Endpoint: ${endpoint}, Region: ${region || "NONE"}`);
    console.log(`Dates: ${JSON.stringify(dates)}`);
    console.log(`Top 3: ${JSON.stringify(firstFive)}`);
    console.log("---------------------------------------------------");
  } catch (error) {
    console.error(`Error fetching ${endpoint} with region ${region}:`, error.message);
  }
}

async function runTests() {
  console.log("Testing Now Playing...");
  await testEndpoint("/movie/now_playing", null);
  await testEndpoint("/movie/now_playing", "IT");

  console.log("Testing Upcoming...");
  await testEndpoint("/movie/upcoming", null);
  await testEndpoint("/movie/upcoming", "IT");
}

runTests();
