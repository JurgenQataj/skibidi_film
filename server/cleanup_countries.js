require("dotenv").config();
const mongoose = require("mongoose");
const Movie = require("./models/Movie");

async function cleanupData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    const movies = await Movie.find({});
    console.log(`Checking ${movies.length} movies...`);

    let count = 0;
    for (const doc of movies) {
      let changed = false;
      
      // Fix production_countries if it's an array of objects
      if (doc.production_countries && doc.production_countries.length > 0) {
        const first = doc.production_countries[0];
        if (typeof first === 'object' && first.name) {
          doc.production_countries = doc.production_countries.map(c => typeof c === 'object' ? c.name : c);
          changed = true;
        }
      }

      if (changed) {
        await doc.save();
        count++;
        if (count % 50 === 0) console.log(`Fixed ${count} movies...`);
      }
    }
    
    console.log(`Cleanup finished. Fixed ${count} movies.`);
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

cleanupData();
