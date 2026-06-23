const express = require("express");
const router = express.Router();
const { param, body } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/healthRecordController");

router.use(auth);

const READ_WRITE_LEVEL = authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR");

const ADMIN_LEVEL = authorizeDesignation("OWNER", "ADMIN");

const recordIdValidation = [
    param("medicalRecordId")
        .notEmpty()
        .withMessage("Medical Record id is required")
];

const createValidation = [
    body("appointmentId").notEmpty().withMessage("Appointment ID is required"),
    body("patientId").notEmpty().withMessage("Patient ID is required"),
    body("doctorEmployeeId")
        .notEmpty()
        .withMessage("Doctor employee ID is required"),
    body("symptoms").notEmpty().withMessage("Symptoms are required"),
    body("diagnosis").notEmpty().withMessage("Diagnosis is required"),
    body("prescriptionItems")
        .optional()
        .isArray()
        .withMessage("Prescription items must be an array"),
    body("prescriptionItems.*.name")
        .notEmpty()
        .withMessage("Prescription item name is required"),
    body("prescriptionItems.*.dosage")
        .notEmpty()
        .withMessage("Dosage is required"),
    body("prescriptionItems.*.duration")
        .notEmpty()
        .withMessage("Duration is required"),
];

const updateValidation = [
    ...recordIdValidation,
    body("symptoms").optional().notEmpty().withMessage("Symptoms cannot be empty"),
    body("diagnosis")
        .optional()
        .notEmpty()
        .withMessage("Diagnosis cannot be empty"),
];

router.post("/", READ_WRITE_LEVEL, createValidation, validate, controller.createHealthRecord);
router.get("/", READ_WRITE_LEVEL, controller.getHealthRecords);
router.get("/:medicalRecordId", READ_WRITE_LEVEL, recordIdValidation, validate, controller.getHealthRecordById);
router.put("/:medicalRecordId", READ_WRITE_LEVEL, updateValidation, validate, controller.updateHealthRecord);
router.delete("/:medicalRecordId", ADMIN_LEVEL, recordIdValidation, validate, controller.deleteHealthRecord);

module.exports = router;
