const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const patientAuth = require("../middlewares/patientAuthMiddleware");
const controller = require("../controllers/patientSelfController");
const {
    patientProfileUpdateValidation
} = require("../validators/patientAuthValidators");
const {
    patientBookAppointmentValidation,
    patientAppointmentIdValidation,
    patientCancelAppointmentValidation
} = require("../validators/patientAppointmentValidators");

router.use(patientAuth);

router.get("/me", controller.getMyProfile);

router.put(
    "/me",
    patientProfileUpdateValidation,
    validate,
    controller.updateMyProfile
);

router.get("/doctors", controller.getDoctors);
router.get("/booked-slots", controller.getBookedSlots);

router.get("/appointments", controller.getMyAppointments);

router.post(
    "/appointments",
    patientBookAppointmentValidation,
    validate,
    controller.bookAppointment
);

router.put(
    "/appointments/:appointmentId",
    [...patientAppointmentIdValidation, ...patientBookAppointmentValidation],
    validate,
    controller.updateMyAppointment
);

router.put(
    "/appointments/:appointmentId/cancel",
    patientCancelAppointmentValidation,
    validate,
    controller.cancelMyAppointment
);

module.exports = router;
