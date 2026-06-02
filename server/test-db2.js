const mongoose = require("mongoose");
require("dotenv").config({ path: "./.env" });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    require("./models/Movie"); // Aggiunto!
    const User = require("./models/User");
    const users = await User.find({}).populate("watchlist");
    for (let u of users) {
      console.log(`User: ${u.username} (${u._id}) - Watchlist size: ${u.watchlist?.length || 0}`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
