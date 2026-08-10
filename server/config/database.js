const mongoose = require("mongoose");
require("dotenv").config();

// Aumenta il buffer timeout: le operazioni attendono fino a 30s
// la connessione prima di andare in errore (default è 10s)
mongoose.set("bufferTimeoutMS", 30000);

const RETRY_DELAY_MS = 5000;  // attesa tra i tentativi
const MAX_RETRIES     = 5;     // numero massimo di tentativi

const connectDB = async (attempt = 1) => {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      family: 4,                        // Forza IPv4 per evitare problemi di risoluzione DNS (Node 17+)
      serverSelectionTimeoutMS: 15000,  // 15s per trovare il server (default 30s)
      connectTimeoutMS:         15000,  // 15s per aprire la socket
      socketTimeoutMS:          45000,  // 45s per le operazioni socket
      heartbeatFrequencyMS:     10000,  // controlla la connessione ogni 10s
      maxPoolSize:              10,
    });
    console.log("✅ Connessione a MongoDB Atlas riuscita!");
    try {
      const Review = require("../models/Review");
      await Review.collection.dropIndex("user_1_movie_1");
      console.log("✅ Indice vecchio user_1_movie_1 rimosso con successo da reviews.");
    } catch (e) {
      // Ignora se l'indice è già stato rimosso o non esiste
    }
    try {
      const Review = require("../models/Review");
      await Review.syncIndexes();
      console.log("✅ Indici di Review sincronizzati con successo.");
    } catch (e) {
      console.error("⚠️ Sync indici Review:", e.message);
    }
  } catch (err) {
    console.error(`❌ Errore di connessione a MongoDB (tentativo ${attempt}/${MAX_RETRIES}):`, err.message);

    if (attempt < MAX_RETRIES) {
      console.log(`🔄 Riprovo tra ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      return connectDB(attempt + 1);
    }

    // Dopo MAX_RETRIES tentativi falliti, esci
    console.error("❌ Impossibile connettersi a MongoDB dopo tutti i tentativi. Uscita.");
    process.exit(1);
  }
};

module.exports = connectDB;
