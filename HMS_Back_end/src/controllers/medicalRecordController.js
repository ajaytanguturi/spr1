const MedicalRecord = require("../models/MedicalRecords");
const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const Employee = require("../models/Employees");
const recordAudit = require("../models/AuditLogs");
const resolveActor = require("../utils/resolveActor");
const parsePagination = require("../utils/parsePagination");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const RECORD_PROJECTION = "-__v";

const resolveDoctorId = (reqUser, body) => {
    const isDoctor = (reqUser.designation ?? "") === "DOCTOR" ||
        (reqUser.roles ?? []).includes("DOCTOR");

    if (isDoctor) return reqUser.employeeCode;

    if (!body.doctorEmployeeId) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.DOCTOR_REQUIRED);
    }
    return body.doctorEmployeeId;
};

const enrichRecord = async (record) => {
    const [patient, doctor] = await Promise.all([
        Patient.findOne({ UHID: record.patientId }).select("name UHID").lean(),
        Employee.findOne({ employeeCode: record.doctorEmployeeId }).select("name employeeCode designation").lean()
    ]);
    return {
        ...record,
        patient: patient ? { UHID: patient.UHID, name: patient.name } : null,
        doctor: doctor ? {
            employeeCode: doctor.employeeCode,
            name: doctor.name,
            designation: doctor.designation
        } : null
    };
};

exports.createMedicalRecord = async (req, res) => {
    const {
        patientId,
        appointmentId,
        symptoms,
        diagnosis,
        prescriptionItems,
        notes
    } = req.body;

    const patient = await Patient.findOne({ UHID: patientId });
    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    const doctorEmployeeId = req.user?.employeeCode || req.user?.profile?.employeeCode;
    const doctor = await Employee.findOne({
        employeeCode: doctorEmployeeId,
        designation: "DOCTOR"
    });
    if (!doctor) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    if (appointmentId) {
        const appointment = await Appointment.findOne({ appointmentId });
        if (!appointment) {
            throw new AppError(STATUS.NOT_FOUND, MESSAGES.APPOINTMENT.NOT_FOUND);
        }
        if (appointment.patientId !== patientId) {
            throw new AppError(STATUS.BAD_REQUEST, MESSAGES.MEDICAL_RECORD.APPOINTMENT_PATIENT_MISMATCH);
        }
    }

    const medicalRecord = await MedicalRecord.create({
        patientId,
        appointmentId: appointmentId || undefined,
        doctorEmployeeId,
        symptoms,
        diagnosis,
        prescriptionItems: prescriptionItems || [],
        notes: notes || undefined,
        createdByEmployeeId: req.user.employeeCode
    });

    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "MEDICAL_RECORD_CREATED",
        targetType: "MEDICAL_RECORD",
        targetId: medicalRecord.medicalRecordId,
        message: MESSAGES.AUDIT.MEDICAL_RECORD_CREATED(
            medicalRecord.medicalRecordId,
            patient.name,
            patient.UHID
        )
    });

    return sendSuccess(res, STATUS.CREATED, MESSAGES.MEDICAL_RECORD.CREATED, {
        medicalRecord
    });
};

exports.getMedicalRecords = async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query, 20);
    const filter = {};

    if (req.query.patientId) {
        filter.patientId = req.query.patientId;
    }
    if (req.query.doctorEmployeeId) {
        filter.doctorEmployeeId = req.query.doctorEmployeeId;
    }
    if (req.query.appointmentId) {
        filter.appointmentId = req.query.appointmentId;
    }

    const [records, total] = await Promise.all([
        MedicalRecord.find(filter)
            .select(RECORD_PROJECTION)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        MedicalRecord.countDocuments(filter)
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        medicalRecords: records
    });
};

exports.getMedicalRecordById = async (req, res) => {
    const { medicalRecordId } = req.params;

    const record = await MedicalRecord.findOne({ medicalRecordId })
        .select(RECORD_PROJECTION)
        .lean();

    if (!record) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.MEDICAL_RECORD.NOT_FOUND);
    }

    const enriched = await enrichRecord(record);

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.RETRIEVED, {
        medicalRecord: enriched
    });
};

exports.getMedicalRecordsByPatient = async (req, res) => {
    const { UHID } = req.params;
    const { page, limit, skip } = parsePagination(req.query, 20);

    const patient = await Patient.findOne({ UHID });
    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    const filter = { patientId: UHID };

    const [records, total] = await Promise.all([
        MedicalRecord.find(filter)
            .select(RECORD_PROJECTION)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        MedicalRecord.countDocuments(filter)
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        patient: { UHID: patient.UHID, name: patient.name },
        medicalRecords: records
    });
};

exports.getMedicalRecordsByDoctor = async (req, res) => {
    const { employeeCode } = req.params;
    const { page, limit, skip } = parsePagination(req.query, 20);

    const doctor = await Employee.findOne({ employeeCode, designation: "DOCTOR" });
    if (!doctor) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
    }

    const filter = { doctorEmployeeId: employeeCode };

    const [records, total] = await Promise.all([
        MedicalRecord.find(filter)
            .select(RECORD_PROJECTION)
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        MedicalRecord.countDocuments(filter)
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.LIST_RETRIEVED, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        doctor: { employeeCode: doctor.employeeCode, name: doctor.name },
        medicalRecords: records
    });
};

exports.updateMedicalRecord = async (req, res) => {
    const { medicalRecordId } = req.params;

    const record = await MedicalRecord.findOne({ medicalRecordId });
    if (!record) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.MEDICAL_RECORD.NOT_FOUND);
    }
    const isDoctor = (req.user.designation ?? "") === "DOCTOR" ||
        (req.user.roles ?? []).includes("DOCTOR");

    if (isDoctor && record.doctorEmployeeId !== req.user.employeeCode) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCESS_DENIED);
    }

    const allowedFields = ["symptoms", "diagnosis", "prescriptionItems", "notes"];
    allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
            record[field] = req.body[field];
        }
    });
    record.updatedByEmployeeId = req.user.employeeCode;
    await record.save();

    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "MEDICAL_RECORD_UPDATED",
        targetType: "MEDICAL_RECORD",
        targetId: record.medicalRecordId,
        message: MESSAGES.AUDIT.MEDICAL_RECORD_UPDATED(record.medicalRecordId)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.UPDATED, {
        medicalRecord: record
    });
};

exports.deleteMedicalRecord = async (req, res) => {
    const { medicalRecordId } = req.params;

    const record = await MedicalRecord.findOne({ medicalRecordId });
    if (!record) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.MEDICAL_RECORD.NOT_FOUND);
    }

    await MedicalRecord.deleteOne({ medicalRecordId });

    const actor = await resolveActor(req.user);
    await recordAudit({
        actor,
        action: "MEDICAL_RECORD_DELETED",
        targetType: "MEDICAL_RECORD",
        targetId: medicalRecordId,
        message: MESSAGES.AUDIT.MEDICAL_RECORD_DELETED(medicalRecordId)
    });

    return sendSuccess(res, STATUS.OK, MESSAGES.MEDICAL_RECORD.DELETED);
};
