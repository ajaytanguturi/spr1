const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/appointmentController");
const {
    createAppointmentValidation,
    bookedSlotsValidation,
    appointmentIdValidation,
    cancelAppointmentValidation,
    approveAppointmentValidation,
    rejectAppointmentValidation
} = require("../validators/appointmentValidators");

router.use(auth);

const RECEPTION_LEVEL = authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST");

const DOCTOR_LEVEL = authorizeDesignation("DOCTOR");

const VIEW_LEVEL = authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST", "DOCTOR");

router.post("/create-appointment", RECEPTION_LEVEL, createAppointmentValidation, validate, controller.createAppointment);

router.get("/my", DOCTOR_LEVEL, controller.getMyAppointments);

router.get("/pending-review", RECEPTION_LEVEL, controller.getPendingAppointments);

router.get("/booked-slots", VIEW_LEVEL, bookedSlotsValidation, validate, controller.getBookedSlots);

router.get("/", VIEW_LEVEL, controller.getAppointments);

router.get("/:appointmentId", VIEW_LEVEL, appointmentIdValidation, validate, controller.getAppointmentById);

router.put("/:appointmentId", RECEPTION_LEVEL, [...appointmentIdValidation, ...createAppointmentValidation], validate, controller.updateAppointment);

router.put("/:appointmentId/approve", RECEPTION_LEVEL, approveAppointmentValidation, validate, controller.approveAppointment);

router.put("/:appointmentId/reject", RECEPTION_LEVEL, rejectAppointmentValidation, validate, controller.rejectAppointment);

router.put("/:appointmentId/cancel", RECEPTION_LEVEL, cancelAppointmentValidation, validate, controller.cancelAppointment);

router.put("/:appointmentId/complete", DOCTOR_LEVEL, appointmentIdValidation, validate, controller.completeAppointment);

module.exports = router;