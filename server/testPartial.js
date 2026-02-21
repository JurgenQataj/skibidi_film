require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Review = require('./models/Review');
const Movie = require('./models/Movie');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne();
  const userId = user._id;

  const reviews = await Review.find({ user: userId }).populate('movie');
  let collCount = 0;
  
  for (const r of reviews) {
    const movie = r.movie;
    if (movie && movie.collection_info) {
       collCount++;
    }
  }

  console.log(`Trovate ${reviews.length} recensioni in totale.`);
  console.log(`Film con collection_info popolato: ${collCount}`);
  
  if (reviews.length > 0) {
    console.log("Esempio di film:", reviews[0].movie);
  }

  process.exit(0);
}
test();
