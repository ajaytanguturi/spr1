const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const Patient = require("../models/Patients");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../utils/emailTemplates");
const { toSafePatient } = require("../utils/toSafePatient");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
require("dotenv").config();

const SALT_ROUNDS = 12;

const RESET_CODE_ALPHABET =
    "ABCDEFGHJKMNPQRSTUVWXYZ" +
    "abcdefghjkmnpqrstuvwxyz" +
    "23456789" +
    "!@#$%&*+-=?";
const RESET_CODE_LENGTH = 8;

const generateResetCode = () =>
    Array.from(
        { length: RESET_CODE_LENGTH },
        () => RESET_CODE_ALPHABET[crypto.randomInt(RESET_CODE_ALPHABET.length)]
    ).join("");

const signPatientToken = (patient) =>
    jwt.sign(
        {
            patientId: patient.UHID,
            type: "PATIENT"
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

exports.register = async (req, res) => {
    const {
        name,
        phone,
        email,
        password,
        gender,
        dob,
        address,
        emergencyContact
    } = req.body;

    const existingPatient = await Patient.findOne({ email });

    if (existingPatient) {
        throw new AppError(STATUS.CONFLICT, MESSAGES.PATIENT.ALREADY_REGISTERED);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const patient = new Patient({
        name,
        phone,
        email,
        passwordHash,
        gender,
        dob,
        address,
        emergencyContact,
        status: "ACTIVE",
        mustChangePassword: false
    });

    await patient.save();

    return sendSuccess(res, STATUS.CREATED, MESSAGES.PATIENT.REGISTER_SUCCESS, {
        patient: toSafePatient(patient)
    });
};

exports.login = async (req, res) => {

    const { email, password } = req.body;

    const patient = await Patient.findOne({ email });
    if (!patient) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isMatch = Boolean(await bcrypt.compare(password, patient.passwordHash));
    if (!isMatch) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    if (patient.status !== "ACTIVE") {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCOUNT_INACTIVE);
    }

    const token = signPatientToken(patient);

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.LOGIN_SUCCESS, {
        token,
        patient: toSafePatient(patient)
    });
};

exports.changePassword = async (req, res) => {

    const { patientId } = req.patient;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const patient = await Patient.findOne({ UHID: patientId });
    if (!patient) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.NOT_FOUND);
    }

    const isMatch = Boolean(await bcrypt.compare(currentPassword, patient.passwordHash));
    if (!isMatch) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.CURRENT_PASSWORD_INCORRECT);
    }

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    const samePassword = Boolean(await bcrypt.compare(newPassword, patient.passwordHash));
    if (samePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    patient.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    patient.mustChangePassword = false;
    await patient.save();

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_CHANGED);
};

exports.forgotPassword = async (req, res) => {

    const { email } = req.body;

    const patient = await Patient.findOne({ email });

    const neutralResponse = () =>
        sendSuccess(res, STATUS.OK, MESSAGES.AUTH.RESET_CODE_SENT);

    if (!patient || patient.status !== "ACTIVE") {
        return neutralResponse();
    }

    const resetCode = generateResetCode();
    patient.resetPasswordTokenHash = crypto
        .createHash("sha256")
        .update(resetCode)
        .digest("hex");
    patient.resetPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await patient.save();

    if (process.env.NODE_ENV !== "production") {
        console.log(`\n[DEV] Patient reset code for ${patient.email}: ${resetCode}\n`);
    }

    try {
        await sendEmail({
            to: patient.email,
            ...emailTemplates.patientPasswordResetCode({ resetCode })
        });
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }

    return neutralResponse();
};

exports.resetPassword = async (req, res) => {

    const { resetCode, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    const hashedCode = crypto
        .createHash("sha256")
        .update(resetCode)
        .digest("hex");

    const patient = await Patient.findOne({
        resetPasswordTokenHash: hashedCode,
        resetPasswordTokenExpiry: { $gt: new Date() }
    });

    if (!patient || patient.status !== "ACTIVE") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.INVALID_RESET_CODE);
    }

    const isSamePassword = Boolean(await bcrypt.compare(newPassword, patient.passwordHash));
    if (isSamePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    patient.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    patient.resetPasswordTokenHash = undefined;
    patient.resetPasswordTokenExpiry = undefined;
    patient.mustChangePassword = false;

    await patient.save();

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);
};
