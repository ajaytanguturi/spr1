require("dotenv").config();

const app = require("../app");
const connectDB = require("../config/db");

async function handler(req, res) {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Database connection error:", error);

    return res.status(500).json({
      message: "Database connection failed"
    });
  }
}

module.exports = handler;