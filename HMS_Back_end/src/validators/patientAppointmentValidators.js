const { body } = require("express-validator");
const {
    appointmentIdValidation,
    cancelAppointmentValidation
} = require("./appointmentValidators");

const patientBookAppointmentValidation = [
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

module.exports = {
    patientBookAppointmentValidation,
    patientAppointmentIdValidation: appointmentIdValidation,
    patientCancelAppointmentValidation: cancelAppointmentValidation
};
