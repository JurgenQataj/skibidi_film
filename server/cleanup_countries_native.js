require("dotenv").config();
const { MongoClient } = require("mongodb");

async function cleanupData() {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    console.log("Connected to MongoDB.");
    const db = client.db();
    const collection = db.collection("movies");

    const movies = await collection.find({}).toArray();
    console.log(`Checking ${movies.length} movies...`);

    let count = 0;
    for (const doc of movies) {
      if (doc.production_countries && doc.production_countries.length > 0) {
        const first = doc.production_countries[0];
        if (typeof first === 'object' && first !== null && first.name) {
          const names = doc.production_countries.map(c => c.name);
          await collection.updateOne({ _id: doc._id }, { $set: { production_countries: names } });
          count++;
        }
      }
    }
    
    console.log(`Cleanup finished. Fixed ${count} movies.`);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await client.close();
  }
}

cleanupData();
