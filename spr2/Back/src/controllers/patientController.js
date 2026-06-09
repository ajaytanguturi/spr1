const bcrypt = require("bcryptjs");
const Patient = require("../models/Patients");
const sendEmail = require("../utils/sendEmail");
const generateTemporaryPassword = require("../utils/generateTemporaryPassword");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const emailTemplates = require("../utils/emailTemplates");

const PATIENT_PROJECTION = "-passwordHash -__v";

exports.createPatient = async (req, res) => {

    try {
        const {
            name,
            phone,
            email,
            gender,
            dob,
            address,
            emergencyContact,
            status
        } = req.body;

        const existingPatient = await Patient.findOne({
            email
        });

        if (existingPatient) {
            return res.status(409).json({
                message: "Patient with this email is already registered"
            });
        }

        const temporaryPassword = generateTemporaryPassword();

        const passwordHash = await bcrypt.hash(temporaryPassword, 12);

        const patientData = {
            name,
            phone,
            email,
            passwordHash,
            gender,
            dob,
            address,
            emergencyContact,
            status,
            createdByEmployeeId: req.user.employeeCode
        };

        const patient = new Patient(patientData);
        await patient.save();

        try {
            await sendEmail({
                to: patient.email,
                ...emailTemplates.patientCredentials({ email, temporaryPassword }),
            });
        } catch (emailError) {
            console.error("Email sending error:", emailError);
        }

        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "PATIENT_CREATED",
            targetType: "PATIENT",
            targetId: patient.UHID,
            message: `Patient ${patient.name} (${patient.UHID}) was registered`
        });

        const safePatient = patient.toObject();
        delete safePatient.passwordHash;
        delete safePatient.__v;

        return res.status(201).json({
            message:
                "Patient account created successfully. Login credentials have been sent via email.",
            patient: safePatient
        });
    }
    catch (err) {
        console.error("Error during patient account creation: ", err);
        return res.status(500).json({
            message: "Server error during patient account creation"
        });
    }
};

exports.getPatients = async (req, res) => {

    try {
        const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(
            Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
            100
        );
        const skip = (page - 1) * limit;

        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.gender) {
            filter.gender = req.query.gender;
        }

        const [patients, total] = await Promise.all([
            Patient.find(filter)
                .select(PATIENT_PROJECTION)
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limit),
            Patient.countDocuments(filter)
        ]);

        return res.status(200).json({
            message: "Patients retrieved successfully",
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            patients
        });
    }
    catch (err) {
        console.error("Error during patients retrieval: ", err);
        return res.status(500).json({
            message: "Server error while fetching patients"
        });
    }
};

exports.searchPatients = async (req, res) => {

    try {
        const query = (req.query.q || "").trim();

        if (!query) {
            return res.status(200).json({
                message: "No search query provided",
                total: 0,
                patients: []
            });
        }

        const escaped = query.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
        const regex = new RegExp(escaped, "i");

        const patients = await Patient.find({
            $or: [
                { name: regex },
                { phone: regex },
                { email: regex },
                { UHID: regex }
            ]
        })
            .select(PATIENT_PROJECTION)
            .sort({ _id: -1 })
            .limit(50);

        return res.status(200).json({
            message: "Search completed successfully",
            total: patients.length,
            patients
        });
    }
    catch (err) {
        console.error("Error during patient search: ", err);
        return res.status(500).json({
            message: "Server error during patient search"
        });
    }
};

exports.getPatientById = async (req, res) => {

    try {
        const { UHID } = req.params;

        const patient = await Patient.findOne({ UHID }).select(
            PATIENT_PROJECTION
        );

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        return res.status(200).json({
            message: "Patient retrieved successfully",
            patient
        });
    }
    catch (err) {
        console.error("Error during patient retrieval: ", err);
        return res.status(500).json({
            message: "Server error while fetching patient"
        });
    }
};

exports.updatePatient = async (req, res) => {

    try {
        const { UHID } = req.params;

        const patient = await Patient.findOne({ UHID });

        if (!patient) {
            return res.status(404).json({
                message: "Patient not found"
            });
        }

        const allowedFields = [
            "name",
            "phone",
            "gender",
            "dob",
            "address",
            "emergencyContact",
            "status"
        ];

        if (req.body.email && req.body.email !== patient.email) {
            const existing = await Patient.findOne({
                email: req.body.email
            });

            if (existing) {
                return res.status(409).json({
                    message: "Another patient with this email already exists"
                });
            }

            patient.email = req.body.email;
        }

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                patient[field] = req.body[field];
            }
        });

        await patient.save();

        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "PATIENT_UPDATED",
            targetType: "PATIENT",
            targetId: patient.UHID,
            message: `Patient ${patient.name} (${patient.UHID}) was updated`
        });

        const safePatient = patient.toObject();
        delete safePatient.passwordHash;
        delete safePatient.__v;

        return res.status(200).json({
            message: "Patient updated successfully",
            patient: safePatient
        });
    }
    catch (err) {
        console.error("Error during patient update: ", err);
        return res.status(500).json({
            message: "Server error during patient update"
        });
    }
};