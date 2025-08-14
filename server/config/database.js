const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Connessione a MongoDB Atlas riuscita!");
  } catch (err) {
    console.error("❌ Errore di connessione a MongoDB:", err.message);
    process.exit(1); // Esce dal processo con errore
  }
};

module.exports = connectDB;
