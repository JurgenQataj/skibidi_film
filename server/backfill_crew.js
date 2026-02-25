require("dotenv").config();
const mongoose = require("mongoose");
const axios = require("axios");
const Movie = require("./models/Movie");

const API_KEY = process.env.TMDB_API_KEY;

async function backfillCrew() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB.");

  // Trova tutti i film e scarica la crew
  const movies = await Movie.find({ 
    media_type: { $ne: "tv" }
  });

  console.log(`Trovati ${movies.length} film da aggiornare con la nuova struttura crew.`);

  let count = 0;
  for (const doc of movies) {
    try {
      const resp = await axios.get(`https://api.themoviedb.org/3/movie/${doc.tmdb_id}?api_key=${API_KEY}&language=it-IT&append_to_response=credits`);
      const data = resp.data;
      const crewData = data.credits?.crew || [];

      doc.production_companies = data.production_companies?.map(c => c.name) || [];
      
      const targetJobs = [
        "Special Effects", "Visual Effects Supervisor", "VFX Artist",
        "Original Music Composer", "Sound Designer", "Sound Mixer", "Original Song Writer",
        "Producer", "Executive Producer",
        "Director of Photography", "Camera Operator", "Lighting Technician", "Gaffer",
        "Production Design", "Art Direction", "Set Decoration",
        "Writer", "Screenplay", "Original Story", "Characters"
      ];

      doc.crew = crewData
         .filter(c => targetJobs.includes(c.job))
         .map(c => ({ name: c.name, job: c.job }));

      // Clean up vecchi fields non più supportati in schema
      doc.vfx = undefined;
      doc.sound = undefined;
      doc.producers = undefined;
      doc.lighting = undefined;
      doc.design = undefined;
      doc.writers = undefined;

      await doc.save();
      
      count++;
      if (count % 20 === 0) console.log(`Aggiornati ${count} film...`);

      // Rate limit safety
      await new Promise(r => setTimeout(r, 60));
    } catch (e) {
      if (e.response && e.response.status === 404) {
        doc.crew = [];
        await doc.save();
      } else {
        console.error(`Errore TMDB su movie ${doc.tmdb_id}: ${e.message}`);
      }
    }
  }

  console.log("Fine aggiornamento crew.");
  process.exit(0);
}

backfillCrew();
