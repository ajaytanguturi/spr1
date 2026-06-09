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
const { RESTRICTED_ROLES_SET } = require("../config/constants");
require("dotenv").config();


exports.login = async (req, res) => {

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const isMatch = Boolean(await bcrypt.compare(password, user.passwordHash));
        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const blockedStatuses = {
            PENDING: "Admin approval is pending",
            REJECTED: "Registration request is rejected",
            INACTIVE: "Account is inactive"
        };

        const blockedMessage = blockedStatuses[user.status];

        if (blockedMessage) {
            return res.status(403).json({
                message: blockedMessage
            });
        }

        user.lastLoginAt = new Date();
        await user.save();

        const employee = await Employee.findOne({
            employeeCode: user.employeeCode
        }).select("-__v");

        if (!employee) {
            return res.status(404).json({
                message: "Employee profile not found!!"
            });
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

        res.status(200).json({
            message: "Login successful",
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
    }
    catch (err) {
        console.error("Login error:", err);

        res.status(500).json({
            message: err.message,
            name: err.name
        });
    }
}

exports.changePassword = async (req, res) => {

    try {
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
            return res.status(404).json({
                message: "User not found!!"
            });
        }

        const isMatch = Boolean(await bcrypt.compare(currentPassword, user.passwordHash));
        if (!isMatch) {
            return res.status(401).json({
                message: "Current password is incorrect"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match!!"
            });
        }

        const samePassword = Boolean(await bcrypt.compare(newPassword, user.passwordHash));
        if (samePassword) {
            return res.status(400).json({
                message: "New password cannot be the same as current password"
            })
        }

        const newPassHash = await bcrypt.hash(newPassword, 10);

        user.passwordHash = newPassHash;
        user.mustChangePassword = false;

        await user.save();

        res.status(200).json({
            message: "Password changed successfully"
        });

    }
    catch (err) {
        console.error("Error during password change: ", err);
        return res.status(500).json({
            message: "Server error during password change"
        });
    }
}

exports.forgotPassword = async (req, res) => {

    try {
        const { email } = req.body;

        const user = await User.findOne({
            email
        });

        if (
            !user ||
            String(user.status) !== "ACTIVE"
        ) {
            return res.status(200).json({
                message:
                    "If the email exists, a reset link has been sent"
            });
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

        res.status(200).json({
            message: "If the email exists, a reset link has been sent."
        });

    }
    catch (err) {
        console.error("Error during forgot password: ", err);
        return res.status(500).json({
            message: "Server error during forgot password"
        });
    }
}

exports.resetPassword = async (req, res) => {

    try {
        const {
            resetToken,
            newPassword,
            confirmPassword
        } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match!!"
            });
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
            return res.status(400).json({
                message: "Invalid or expired token"
            });
        }

        if (String(user.status) !== "ACTIVE") {
            return res.status(400).json({
                message: "Invalid or expired token"
            })
        }

        const isSamePassword = Boolean(await bcrypt.compare(newPassword, user.passwordHash));
        if (isSamePassword) {
            return res.status(400).json({
                message: "New password cannot be the same as current password"
            });
        }
        const newHash = await bcrypt.hash(newPassword, 10);

        user.passwordHash = newHash;

        user.resetPasswordTokenHash = null;
        user.resetPasswordTokenExpiry = null;
        user.mustChangePassword = false;

        await user.save();

        res.status(200).json({
            message: "Password reset successful"
        })

    }
    catch (err) {
        console.error("Error during reset password: ", err);
        res.status(500).json({
            message: "Server error during reset password"
        });
    }
}

exports.logout = (req, res) => {
    res.status(200).json({
        message: "User has been logged out successfully"
    });
}

exports.me = async (req, res) => {
    try {
        return await getCurrentUser(req.user.employeeCode, res);
    }
    catch (err) {
        console.error("Error during me: ", err);
        return res.status(500).json({
            message: "Server error while fetching current user"
        });
    }
}

exports.selfRegister = async (req, res) => {

    const { username, email, password, designation } = req.body;

    try {
        if (RESTRICTED_ROLES_SET.has(designation)) {
            return res.status(403).json({
                message:
                    "Invalid designation. Cannot create admin or owner accounts."
            });
        }

        const uniquenessResult = await validateUniqueEmployeeFields(req.body);

        if (!uniquenessResult.success) {
            return res.status(uniquenessResult.status).json({
                message: uniquenessResult.message
            });
        }

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

        return res.status(201).json({
            message: "Registration request successful. Wait for admin approval.",

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
    }
    catch (err) {
        console.error("Employee self registration error:", err);

        return res.status(500).json({
            message: "Server error during employee self registration"
        });
    }
}