const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const Movie = require("./models/Movie");
    const total = await Movie.countDocuments({});
    const missingYears = await Movie.countDocuments({
      $or: [
        { release_year: { $exists: false } },
        { release_year: null }
      ]
    });
    console.log(`Total movies in DB: ${total}`);
    console.log(`Movies missing release_year: ${missingYears}`);
    
    if (missingYears > 0) {
      const sample = await Movie.find({
        $or: [
          { release_year: { $exists: false } },
          { release_year: null }
        ]
      }).limit(5);
      console.log("Sample missing years:", sample.map(m => m.title));
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
