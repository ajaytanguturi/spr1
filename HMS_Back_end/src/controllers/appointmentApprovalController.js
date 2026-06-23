const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const sendAppointmentEmail = require("../utils/sendAppointmentEmail");
const emailTemplates = require("../utils/emailTemplates");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

exports.getPendingAppointments = async (req, res) => {
    const appointments = await Appointment.find({ status: "PENDING_REVIEW" })
        .sort({ created_at: -1 })
        .lean();
    return sendSuccess(
        res,
        STATUS.OK,
        MESSAGES.APPOINTMENT.PENDING_LIST_RETRIEVED,
        { total: appointments.length, appointments }
    );
};

exports.approveAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }
    if (appointment.status !== "PENDING_REVIEW") {
        throw new AppError(
            STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.NOT_PENDING_REVIEW
        );
    }
    appointment.status = "BOOKED";
    appointment.approvedBy = req.user.employeeCode;
    appointment.approvedAt = new Date();
    await appointment.save();

    const patient = await Patient.findOne({ UHID: appointment.patientId });
    const doctor = await Employee.findOne({ employeeCode: appointment.doctorEmployeeId });
    if (patient) {
        await sendAppointmentEmail(
            patient.email,
            emailTemplates.appointmentApproved({
                patientName: patient.name,
                doctorName: doctor?.name ?? "Doctor",
                appointmentDate: appointment.appointmentDate,
                timeSlot: appointment.timeSlot,
            })
        );
    }
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "APPOINTMENT_APPROVED",
        targetType: "APPOINTMENT",
        targetId: appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_APPROVED(
            appointmentId, patient?.name ?? appointment.patientId
        ),
    });
    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.APPROVED, { appointment });
};

exports.rejectAppointment = async (req, res) => {
    const { appointmentId } = req.params;
    const { rejectionReason } = req.body;
    const appointment = await Appointment.findOne({ appointmentId });
    if (!appointment) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
    }
    if (appointment.status !== "PENDING_REVIEW") {
        throw new AppError(
            STATUS.BAD_REQUEST, MESSAGES.APPOINTMENT.NOT_PENDING_REVIEW
        );
    }
    appointment.status = "CANCELED";
    appointment.cancellationReason = rejectionReason;
    appointment.rejectedBy = req.user.employeeCode;
    appointment.rejectedAt = new Date();
    appointment.rejectionReason = rejectionReason;
    await appointment.save();

    const patient = await Patient.findOne({ UHID: appointment.patientId });
    const doctor = await Employee.findOne({ employeeCode: appointment.doctorEmployeeId });
    if (patient) {
        await sendAppointmentEmail(
            patient.email,
            emailTemplates.appointmentRejected({
                patientName: patient.name,
                doctorName: doctor?.name ?? "Doctor",
                appointmentDate: appointment.appointmentDate,
                timeSlot: appointment.timeSlot,
                rejectionReason,
            })
        );
    }
    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "APPOINTMENT_REJECTED",
        targetType: "APPOINTMENT",
        targetId: appointmentId,
        message: MESSAGES.AUDIT.APPOINTMENT_REJECTED(
            appointmentId,
            patient?.name ?? appointment.patientId,
            rejectionReason
        ),
    });
    return sendSuccess(res, STATUS.OK, MESSAGES.APPOINTMENT.REJECTED, { appointment });
};