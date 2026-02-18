require("dotenv").config();
const axios = require("axios");

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

async function verifyControllerLogic() {
    console.log("Verifying Controller Logic for 'Coming Soon' (Upcoming) with region=IT...");

    // Replicating the logic from movieController.js discoverMovies
    const category = "upcoming";
    let endpoint = "/movie/upcoming"; 
    
    const params = {
      api_key: API_KEY,
      language: "it-IT",
      page: 1,
      sort_by: "popularity.desc",
      region: "IT" // THIS IS WHAT WE ADDED
    };

    try {
        const fetchUrl = `${BASE_URL}${endpoint}`;
        console.log(`Fetching from: ${fetchUrl}`);
        console.log(`Params:`, JSON.stringify(params, null, 2));

        const response = await axios.get(fetchUrl, { params });
        const results = response.data.results.slice(0, 5);
        const dates = response.data.dates;

        console.log("\n--- Results (First 5) ---");
        results.forEach(m => {
            console.log(`- ${m.title} (${m.release_date})`);
        });
        console.log(`\nDate Range: ${dates.minimum} to ${dates.maximum}`);
        
        console.log("\nSUCCESS: Data fetched successfully with region=IT.");

    } catch (error) {
        console.error("ERROR:", error.message);
    }
}

verifyControllerLogic();
