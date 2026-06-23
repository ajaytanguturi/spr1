const { body, param } = require("express-validator");

const createMedicalRecordValidation = [
    body("patientId").notEmpty().withMessage("Patient Id is required"),

    body("appointmentId").optional({ nullable: true, checkFalsy: true }).isString().withMessage("Appointment Id cannot be empty"),

    body("doctorEmployeeId").optional({ nullable: true, checkFalsy: true }).isString().withMessage("Doctor employee id cannot be empty"),

    body("symptoms").trim().notEmpty().withMessage("Symptoms are Required"),

    body("diagnosis").trim().notEmpty().withMessage("Diagnosis is required"),

    body("prescriptionItems").optional().isArray().withMessage("Prescription items must be an array"),

    body("prescriptionItems.*.name").if(body("prescriptionItems").exists()).trim().notEmpty().withMessage("Each Prescription item requires a medicine name"),

    body("prescriptionItems.*.dosage").if(body("prescriptionItems").exists()).trim().notEmpty().withMessage("Each prescription item requires a dosage"),

    body("prescriptionItems.*.duration").if(body("prescriptionItems").exists()).trim().notEmpty().withMessage("Each prescription item requires a duration"),

    body("notes").optional().isString().withMessage("Notes must be text")
];

const updateMedicalRecordValidation = [
    param("medicalRecordId").notEmpty().withMessage("Medical Record id is required"),

    body("symptoms").optional().trim().notEmpty().withMessage("Symptoms cant be empty"),

    body("diagnosis").optional().trim().notEmpty().withMessage("Diagnosis cannot be empty"),

    body("prescriptionItems").optional().isArray().withMessage("Prescription items must be an array"),

    body("prescriptionItems.*.name").if(body("prescriptionItems").exists()).trim().notEmpty().withMessage("Each prescription item requires a medicine name"),

    body("prescriptionItems.*.dosage").if(body("prescriptionItems").exists()).trim().notEmpty().withMessage("Each prescription item requires a dosage"),

    body("prescriptionItems.*.duration").if(body("prescriptionItems").exists()).trim().notEmpty().withMessage("Each prescription item requires a duration"),

    body("notes").optional().isString().withMessage("Notes must be text")
];

const medicalRecordIdValidation = [
    param("medicalRecordId").notEmpty().withMessage("Medical Record id is required"),
];

module.exports = { createMedicalRecordValidation, updateMedicalRecordValidation, medicalRecordIdValidation };