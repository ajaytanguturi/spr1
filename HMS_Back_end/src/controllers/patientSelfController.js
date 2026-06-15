const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const User = require("../models/Users");
const Appointment = require("../models/Appointments");
const emailTemplates = require("../utils/emailTemplates");
const checkAppointmentValidity = require("../validators/checkAppointmentValidity");
const paginateAppointments = require("../utils/paginateAppointments");
const getBookedSlots = require("../utils/getBookedSlots");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const cancelAppointmentRecord = require("../utils/cancelAppointmentRecord");
const recordAudit = require("../utils/recordAudit");
const { toSafePatient, PATIENT_SAFE_PROJECTION } = require("../utils/toSafePatient");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const patientActor = (patient) => ({
    employeeCode: patient.UHID,
    name: patient.name,
    designation: "PATIENT"
});

exports.getMyProfile = async (req, res) => {

    const patient = await Patient.findOne({
        UHID: req.patient.patientId
    }).select(PATIENT_SAFE_PROJECTION);

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.PROFILE_RETRIEVED, {
        patient
    });
};

exports.updateMyProfile = async (req, res) => {

    const patient = await Patient.findOne({
        UHID: req.patient.patientId
    });

    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    if (req.body.email && req.body.email !== patient.email) {
        const existing = await Patient.findOne({ email: req.body.email });
        if (existing) {
            throw new AppError(STATUS.CONFLICT, MESSAGES.PATIENT.EMAIL_EXISTS);
        }
        patient.email = req.body.email;
    }

    const editableFields = ["phone", "address", "emergencyContact"];
    editableFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            patient[field] = req.body[field];
        }
    });

    await patient.save();

    await recordAudit({
        actor: patientActor(patient),
        action: "PATIENT_UPDATED",
        targetType: "PATIENT",
        targetId: patient.UHID,
        message: MESSAGES.AUDIT.PATIENT_PROFILE_UPDATED(patient.name, patient.UHID)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.PATIENT.PROFILE_UPDATED, {
        patient: toSafePatient(patient)
    });
};

exports.getDoctors = async (req, res) => {

    const users = await User.find({ status: "ACTIVE" }).select("employeeCode");
    const activeCodes = users.map((u) => u.employeeCode);

    const doctors = await Employee.find({
        designation: "DOCTOR",
        employeeCode: { $in: activeCodes }
    }).select(
        "employeeCode name specialization department consultationFee availabilitySlots qualification joiningDate"
    );

    return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.DOCTORS_RETRIEVED, {
        total: doctors.length,
        doctors
    });
};

exports.getBookedSlots = getBookedSlots;

exports.getMyAppointments = async (req, res) => {

    const filter = { patientId: req.patient.patientId };
    if (req.query.status) {
        filter.status = req.query.status;
    }

    return paginateAppointments(filter, req.query, res);
};

exports.bookAppointment = async (req, res) => {

    const patientId = req.patient.patientId;
    const { doctorEmployeeId, appointmentDate, timeSlot } = req.body;

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
        timeSlot
    });

    await sendAppointmentEmail(patient.email, emailTemplates.appointmentScheduled({
        patientName: patient.name,
        doctorName: doctor.name,
        appointmentDate,
        timeSlot
    }));

    await recordAudit({
        actor: patientActor(patient),
        action: "APPOINTMENT_CREATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_BOOKED_BY_PATIENT(
            appointment.appointmentId,
            patient.name,
            doctor.name
        )
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.APPOINTMENT.CREATED, {
        appointment
    });
};
exports.updateMyAppointment = async (req, res) => {

    const patientId = req.patient.patientId;
    const { appointmentId } = req.params;
    const { doctorEmployeeId, appointmentDate, timeSlot } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    if (appointment.patientId !== patientId) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_MODIFY);
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

    await recordAudit({
        actor: patientActor(patient),
        action: "APPOINTMENT_UPDATED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_RESCHEDULED_BY_PATIENT(
            appointment.appointmentId,
            patient.name
        )
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.UPDATED, {
        appointment
    });
};

exports.cancelMyAppointment = async (req, res) => {

    const patientId = req.patient.patientId;
    const { appointmentId } = req.params;
    const { cancellationReason } = req.body;

    const appointment = await Appointment.findOne({ appointmentId });

    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }

    if (appointment.patientId !== patientId) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.APPOINTMENT.OWN_ONLY_CANCEL);
    }

    await cancelAppointmentRecord(appointment, cancellationReason);

    await recordAudit({
        actor: { employeeCode: appointment.patientId, designation: "PATIENT" },
        action: "APPOINTMENT_CANCELED",
        targetType: "APPOINTMENT",
        targetId: appointment.appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_CANCELLED_BY_PATIENT(
            appointment.appointmentId,
            cancellationReason
        )
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.CANCELLED, {
        appointment
    });
};
