const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  try {
    await mongoose.connect(process.env.DATABASE_URL, {
      family: 4,
      serverSelectionTimeoutMS: 5000
    });
    console.log("SUCCESS with family: 4");
    process.exit(0);
  } catch (err) {
    console.error("FAIL with family: 4", err.message);
    process.exit(1);
  }
}
test();
