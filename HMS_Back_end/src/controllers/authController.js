const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const User = require("../models/Users");
const Employee = require("../models/Employees");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../utils/emailTemplates");
const buildEmployeeProfile = require("../utils/buildEmployeeProfile");
const buildEmployeeData = require("../utils/buildEmployeeData");
const validateUniqueEmployeeFields = require("../validators/validateUniqueEmployeeFields");
const getCurrentUser = require("../utils/getCurrentUser");
const { RESTRICTED_ROLES_SET } = require("../constants/domain");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");
require("dotenv").config();

exports.login = async (req, res) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const isMatch = Boolean(await bcrypt.compare(password, user.passwordHash));
    if (!isMatch) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_CREDENTIALS);
    }

    const blockedStatuses = {
        PENDING: MESSAGES.AUTH.APPROVAL_PENDING,
        REJECTED: MESSAGES.AUTH.REGISTRATION_REJECTED,
        INACTIVE: MESSAGES.AUTH.ACCOUNT_INACTIVE
    };

    const blockedMessage = blockedStatuses[user.status];

    if (blockedMessage) {
        throw new AppError(STATUS.FORBIDDEN, blockedMessage);
    }

    user.lastLoginAt = new Date();
    await user.save();

    const employee = await Employee.findOne({
        employeeCode: user.employeeCode
    }).select("-__v");

    if (!employee) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.EMPLOYEE_PROFILE_NOT_FOUND);
    }

    const profile = buildEmployeeProfile(employee);

    const token = jwt.sign(
        {
            employeeCode: user.employeeCode,
            roles: user.roles
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN
        }
    );

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.LOGIN_SUCCESS, {
        token,
        user: {
            employeeCode: user.employeeCode,
            username: user.username,
            email: user.email,
            roles: user.roles,
            mustChangePassword: user.mustChangePassword,
            lastLoginAt: user.lastLoginAt,
            profile
        }
    });
};

exports.changePassword = async (req, res) => {

    const employeeCode = req.user.employeeCode;

    const {
        currentPassword,
        newPassword,
        confirmPassword
    } = req.body;

    const user = await User.findOne({
        employeeCode
    });

    if (!user) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
    }

    const isMatch = Boolean(await bcrypt.compare(currentPassword, user.passwordHash));
    if (!isMatch) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.CURRENT_PASSWORD_INCORRECT);
    }

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    const samePassword = Boolean(await bcrypt.compare(newPassword, user.passwordHash));
    if (samePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    const newPassHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = newPassHash;
    user.mustChangePassword = false;

    await user.save();

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_CHANGED);
};

exports.forgotPassword = async (req, res) => {

    const { email } = req.body;

    const user = await User.findOne({
        email
    });

    const neutralResponse = () =>
        sendSuccess(res, STATUS.OK, MESSAGES.AUTH.RESET_LINK_SENT);

    if (
        !user ||
        String(user.status) !== "ACTIVE"
    ) {
        return neutralResponse();
    }

    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const resetPasswordTokenHash =
        crypto
            .createHash("sha256")
            .update(resetPasswordToken)
            .digest("hex");

    user.resetPasswordTokenHash = resetPasswordTokenHash;
    user.resetPasswordTokenExpiry = resetPasswordTokenExpiry;

    await user.save();

    if (process.env.NODE_ENV !== "production") {
        console.log(
            "\n[DEV] Reset link for " + user.email + ":\n" +
            emailTemplates.frontendUrl() +
            "/reset-password?token=" + resetPasswordToken + "\n"
        );
    }

    try {
        await sendEmail({
            to: user.email,
            ...emailTemplates.passwordReset({ resetToken: resetPasswordToken })
        });
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }

    return neutralResponse();
};

exports.resetPassword = async (req, res) => {

    const {
        resetToken,
        newPassword,
        confirmPassword
    } = req.body;

    if (newPassword !== confirmPassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORDS_DO_NOT_MATCH);
    }

    const hashedToken =
        crypto
            .createHash("sha256")
            .update(resetToken)
            .digest("hex");

    const user = await User.findOne({
        resetPasswordTokenHash: hashedToken,
        resetPasswordTokenExpiry: {
            $gt: new Date()
        }
    });

    if (!user) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.INVALID_TOKEN);
    }

    if (String(user.status) !== "ACTIVE") {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.INVALID_TOKEN);
    }

    const isSamePassword = Boolean(await bcrypt.compare(newPassword, user.passwordHash));
    if (isSamePassword) {
        throw new AppError(STATUS.BAD_REQUEST, MESSAGES.AUTH.PASSWORD_SAME_AS_CURRENT);
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    user.passwordHash = newHash;

    user.resetPasswordTokenHash = null;
    user.resetPasswordTokenExpiry = null;
    user.mustChangePassword = false;

    await user.save();

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.PASSWORD_RESET_SUCCESS);
};

exports.logout = (req, res) =>
    sendSuccess(res, STATUS.OK, MESSAGES.AUTH.LOGOUT_SUCCESS);

exports.me = async (req, res) => {
    const user = await getCurrentUser(req.user.employeeCode);

    return sendSuccess(res, STATUS.OK, MESSAGES.AUTH.USER_RETRIEVED, {
        user
    });
};

exports.selfRegister = async (req, res) => {

    const { username, email, password, designation } = req.body;

    if (RESTRICTED_ROLES_SET.has(designation)) {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.INVALID_DESIGNATION);
    }

    await validateUniqueEmployeeFields(req.body);

    const passwordHash = await bcrypt.hash(password, 10);

    const employeeData = buildEmployeeData(req.body);

    const employee = new Employee(employeeData);
    await employee.save();

    const user = new User({
        username,
        email,
        passwordHash,
        roles: ["STAFF"],
        employeeCode: employee.employeeCode,
        status: "PENDING",
        mustChangePassword: false,
        createdByAdmin: false,
        approvedBy: null,
        approvedAt: null,
        createdBy: "Self registration"
    });

    await user.save();

    try {
        const admins = await User.find({
            roles: { $in: ["ADMIN", "OWNER"] },
            status: "ACTIVE"
        });

        const adminEmails = admins.map((admin) => admin.email);

        if (adminEmails.length) {
            await sendEmail({
                to: adminEmails,
                ...emailTemplates.registrationRequest({
                    name: employee.name,
                    employeeCode: employee.employeeCode,
                    department: employee.department,
                    designation: employee.designation
                })
            });
        }
    } catch (emailError) {
        console.error("Admin notification email error:", emailError);
    }

    return sendSuccess(res, STATUS.CREATED, MESSAGES.AUTH.SELF_REGISTER_SUCCESS, {
        user: {
            username: user.username,
            email: user.email,
            roles: user.roles
        },

        employee: {
            employeeCode: employee.employeeCode,
            name: employee.name,
            department: employee.department,
            designation: employee.designation
        }
    });
};
