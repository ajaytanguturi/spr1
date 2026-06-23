const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/patientController");
const { createPatientValidation, updatePatientValidation, uhidValidation } = require("../validators/patientValidators");
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");

router.use(auth);

const FULL_ACCESS = authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST");
const READ_ONLY = authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR");

router.post("/create-patient", FULL_ACCESS, createPatientValidation, validate, controller.createPatient);

router.get("/search", READ_ONLY, controller.searchPatients);

router.get("/", READ_ONLY, controller.getPatients);

router.get("/:UHID", READ_ONLY, uhidValidation, validate, controller.getPatientById);

router.put("/:UHID", FULL_ACCESS, updatePatientValidation, validate, controller.updatePatient);

router.delete("/:UHID", authorizeRoles("OWNER", "ADMIN"), uhidValidation, validate, controller.deletePatient);

module.exports = router;