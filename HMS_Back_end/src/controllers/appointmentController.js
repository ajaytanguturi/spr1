const Appointment = require("../models/Appointments");
const checkAppointmentValidity = require("../validators/checkAppointmentValidity");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const emailTemplates = require("../utils/emailTemplates");
const enrichAppointments = require("../utils/enrichAppointments");
const paginateAppointments = require("../utils/paginateAppointments");
const getBookedSlots = require("../utils/getBookedSlots");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const cancelAppointmentRecord = require("../utils/cancelAppointmentRecord");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

exports.createAppointment = async (req, res) => {

    const {
        patientId,
        doctorEmployeeId,
        appointmentDate,
        timeSlot
    } = req.body;

    const { patient, doctor } = await checkAppointmentValidity({
        patientId,
        doctorId: doctorEmployeeId,
        appointmentDate,
        timeSlot
    });

    const appointment = await Appointment.create({
        patientId,
        doctorEmployeeId,
        appointmentDate,
        timeSlot,
        createdByEmployeeId: req.user.employeeCode
    });

    await sendAppointmentEmail(patient.email, emailTemplates.appointmentScheduled({
        patientName: patient.name,
        doctorName: doctor.name,
        appointmentDate,
        timeSlot
    }));

    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "APPOINTMENT_CREATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_BOOKED(
            appointment.appointmentId,
            patient.name,
            doctor.name
        )
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.APPOINTMENT.CREATED, {
        appointment
    });
};

exports.getAppointments = async (req, res) => {

    const filter = {};

    if (req.query.status) {
        filter.status = req.query.status;
    }

    if (req.query.doctorEmployeeId) {
        filter.doctorEmployeeId = req.query.doctorEmployeeId;
    }

    if (req.query.patientId) {
        filter.patientId = req.query.patientId;
    }

    return paginateAppointments(filter, req.query, res);
};

exports.getMyAppointments = async (req, res) => {

    const filter = { doctorEmployeeId: req.user.employeeCode };

    if (req.query.status) {
        filter.status = req.query.status;
    }

    return paginateAppointments(filter, req.query, res);
};

exports.getAppointmentById = async (req, res) => {

    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({
        appointmentId
    })
        .select("-__v")
        .lean();

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    const [enriched] = await enrichAppointments([appointment]);

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.RETRIEVED, {
        appointment: enriched
    });
};

exports.getBookedSlots = getBookedSlots;

exports.cancelAppointment = async (req, res) => {

    const { appointmentId } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    await cancelAppointmentRecord(appointment, cancellationReason);

    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "APPOINTMENT_CANCELED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_CANCELLED(
            appointment.appointmentId,
            cancellationReason
        )
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.CANCELLED, {
        appointment
    });
};

exports.updateAppointment = async (req, res) => {

    const { appointmentId } = req.params;
    const {
        patientId,
        doctorEmployeeId,
        appointmentDate,
        timeSlot
    } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    if (appointment.status !== "BOOKED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.ONLY_BOOKED_EDITABLE);
    }

    const { patient, doctor } = await checkAppointmentValidity({
        patientId,
        doctorId: doctorEmployeeId,
        appointmentDate,
        timeSlot,
        excludeAppointmentId: appointmentId
    });

    appointment.patientId = patientId;
    appointment.doctorEmployeeId = doctorEmployeeId;
    appointment.appointmentDate = appointmentDate;
    appointment.timeSlot = timeSlot;
    await appointment.save();

    await sendAppointmentEmail(patient.email, emailTemplates.appointmentUpdated({
        patientName: patient.name,
        doctorName: doctor.name,
        appointmentDate,
        timeSlot
    }));
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "APPOINTMENT_UPDATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_UPDATED(appointment.appointmentId)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.UPDATED, {
        appointment
    });
};

exports.completeAppointment = async (req, res) => {

    const { appointmentId } = req.params;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    if (appointment.doctorEmployeeId !== req.user.employeeCode) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_COMPLETE);
    }

    if (appointment.status === "CANCELED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.CANCELLED_CANNOT_COMPLETE);
    }

    if (appointment.status === "COMPLETED") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.ALREADY_COMPLETED);
    }

    const slotStart = (appointment.timeSlot || "").split("-")[0];
    const [slotHour, slotMinute] = slotStart.split(":").map(Number);
    const scheduledStart = new Date(appointment.appointmentDate);
    if (!Number.isNaN(slotHour) && !Number.isNaN(slotMinute)) {
        scheduledStart.setHours(slotHour, slotMinute, 0, 0);
    }
    if (scheduledStart.getTime() > Date.now()) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.CANNOT_COMPLETE_BEFORE_TIME);
    }

    appointment.status = "COMPLETED";
    await appointment.save();

    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "APPOINTMENT_COMPLETED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_COMPLETED(appointment.appointmentId)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.COMPLETED, {
        appointment
    });
};
