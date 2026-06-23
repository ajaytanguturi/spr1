const { body, param, query } = require("express-validator");

const createAppointmentValidation = [
    body("patientId")
        .notEmpty()
        .withMessage("Patient id is required"),

    body("doctorEmployeeId")
        .notEmpty()
        .withMessage("Doctor's employee id is required"),

    body("appointmentDate")
        .isISO8601()
        .toDate()
        .withMessage("Valid appointment date is required"),

    body("timeSlot")
        .matches(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/)
        .withMessage("Time slot must be in HH:mm-HH:mm format")
];

const bookedSlotsValidation = [
    query("doctorEmployeeId")
        .notEmpty()
        .withMessage("doctorEmployeeId is required"),

    query("date")
        .isISO8601()
        .withMessage("Valid date is required")
];

const appointmentIdValidation = [
    param("appointmentId")
        .notEmpty()
        .withMessage("Appointment id is required")
];

const cancelAppointmentValidation = [
    param("appointmentId")
        .notEmpty()
        .withMessage("Appointment id is required"),

    body("cancellationReason")
        .trim()
        .notEmpty()
        .withMessage("Cancellation reason is required")
];

const approveAppointmentValidation = [
    param("appointmentId")
        .notEmpty()
        .withMessage("Appointment id is required")
];

const rejectAppointmentValidation = [
    param("appointmentId")
        .notEmpty()
        .withMessage("Appointment id is required"),

    body("rejectionReason")
        .trim()
        .notEmpty()
        .withMessage("Rejection reason is required")
];
module.exports = {
    createAppointmentValidation,
    bookedSlotsValidation,
    appointmentIdValidation,
    cancelAppointmentValidation,
    approveAppointmentValidation,
    rejectAppointmentValidation
};