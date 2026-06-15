require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const runSeeders = require("./utils/seed");

const PORT = process.env.PORT || 5000;

const start = async () => { // NOSONAR - top-level await is unavailable in CommonJS modules
  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }

  try {
    await runSeeders();
    console.log("Seeding complete");
  } catch (err) {
    console.error("Startup seeding failed (continuing to start server):", err);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
