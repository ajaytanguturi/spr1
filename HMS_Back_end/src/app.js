require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const ownerRoutes = require("./routes/ownerRoutes");
const patientRoutes = require("./routes/patientRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const employeeRoutes = require("./routes/employeeRoutes");
const nodeRoutes = require("./routes/nodeRoutes");
const patientAuthRoutes = require("./routes/patientAuthRoutes");
const patientSelfRoutes = require("./routes/patientSelfRoutes");
const mongoose = require("mongoose");

const notFound = require("./middlewares/notFound");
const errorHandler = require("./middlewares/errorHandler");
const { sendSuccess } = require("./utils/apiResponse");
const STATUS = require("./constants/statusCodes");
const MESSAGES = require("./constants/messages");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(morgan("dev"));

app.use(express.json());

app.get("/api/db-status", (req, res) =>
  sendSuccess(res, STATUS.OK, MESSAGES.COMMON.DB_STATUS_RETRIEVED, {
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    dbName: mongoose.connection.name,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/nodes", nodeRoutes);

app.use("/api/patient/auth", patientAuthRoutes);
app.use("/api/patient", patientSelfRoutes);

app.get("/", (req, res) =>
  sendSuccess(res, STATUS.OK, MESSAGES.COMMON.API_RUNNING)
);

app.use(notFound);

app.use(errorHandler);

module.exports = app;