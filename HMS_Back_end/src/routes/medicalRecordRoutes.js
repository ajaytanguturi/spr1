const express = require("express");
const router = express.Router();
const { param } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/medicalRecordController");
const {
    createMedicalRecordValidation,
    updateMedicalRecordValidation,
    medicalRecordIdValidation
} = require("../validators/medicalRecordValidators");
const validateEmployeeStatus = require("../validators/validateEmployeeStatus");

router.use(auth);

const VIEW_LEVEL = authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR", "NURSE");
const WRITE_LEVEL = authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR");
const DELETE_LEVEL = authorizeDesignation("ONWER", "ADMIN", "RECEPTIONIST");

router.post("/", WRITE_LEVEL, createMedicalRecordValidation, validate, controller.createMedicalRecord);
router.get("/", VIEW_LEVEL, controller.getMedicalRecords);

router.get(
    "/patient/:UHID",
    VIEW_LEVEL,
    [param("UHID").notEmpty().withMessage("UHID is required")],
    validate,
    controller.getMedicalRecordsByPatient
);

router.get(
    "/doctor/:employeeCode",
    VIEW_LEVEL,
    [param("employeeCode").notEmpty().withMessage("Employee code is required")],
    validate, controller.getMedicalRecordsByDoctor
);

router.get(
    "/:medicalRecordId",
    VIEW_LEVEL,
    medicalRecordIdValidation, validate, controller.getMedicalRecordById
);

router.put(
    "/:medicalRecordId",
    WRITE_LEVEL,
    updateMedicalRecordValidation, validate, controller.updateMedicalRecord
);

router.delete(
    "/:medicalRecordId",
    DELETE_LEVEL,
    medicalRecordIdValidation, validate, controller.deleteMedicalRecord
);

module.exports = router;