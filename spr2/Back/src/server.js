require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => { // NOSONAR - top-level await is unavailable in CommonJS modules
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log("MongoDB connected");
  });
});