const User = require("../models/Users");
const Employee = require("../models/Employees");
const ProfileChangeRequest = require("../models/ProfileChangeRequests");
const buildEmployeeProfile = require("../utils/buildEmployeeProfile");
const sendEmail = require("../utils/sendEmail");
const emailTemplates = require("../utils/emailTemplates");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const getCurrentUser = require("../utils/getCurrentUser");
const { RESTRICTED_ROLES_SET } = require("../config/constants");

const SELF_EDITABLE_FIELDS = ["phone", "qualification"];

exports.getMe = async (req, res) => {

    try {
        return await getCurrentUser(req.user.employeeCode, res);
    }
    catch (err) {
        console.error("Error during getMe: ", err);
        return res.status(500).json({
            message: "Server error while fetching current user"
        });
    }
};

exports.getDoctors = async (req, res) => {

    try {
        const users = await User.find({
            status: "ACTIVE"
        }).select("employeeCode");

        const activeCodes = users.map((u) => u.employeeCode);

        const doctors = await Employee.find({
            designation: "DOCTOR",
            employeeCode: { $in: activeCodes }
        }).select(
            "employeeCode name specialization department consultationFee availabilitySlots qualification joiningDate"
        );

        return res.status(200).json({
            message: "Doctors retrieved successfully",
            total: doctors.length,
            doctors
        });
    }
    catch (err) {
        console.error("Error during doctors retrieval: ", err);
        return res.status(500).json({
            message: "Server error while fetching doctors"
        });
    }
};

exports.profileUpdate = async (req, res) => {

    try {
        const employee = await Employee.findOne({
            employeeCode: req.user.employeeCode
        });

        if (!employee) {
            return res.status(404).json({
                message: "Employee not found"
            });
        }

        const requestedChanges = {};

        SELF_EDITABLE_FIELDS.forEach((field) => {
            if (req.body[field] === undefined) {
                return;
            }

            const oldValue = employee[field];
            const newValue = req.body[field];

            const isDifferent =
                JSON.stringify(oldValue) !== JSON.stringify(newValue);

            if (isDifferent) {
                requestedChanges[field] = {
                    old: oldValue,
                    new: newValue
                };
            }
        });

        if (Object.keys(requestedChanges).length === 0) {
            return res.status(400).json({
                message: "No valid changes were requested"
            });
        }

        const isPrivileged = (req.user.roles || []).some((role) =>
            RESTRICTED_ROLES_SET.has(role)
        );

        if (isPrivileged) {
            Object.keys(requestedChanges).forEach((field) => {
                employee[field] = requestedChanges[field].new;
            });

            await employee.save();

            const actor = await resolveActor(req.user);
            await recordAudit({
                actor,
                action: "PROFILE_UPDATED",
                targetType: "EMPLOYEE",
                targetId: employee.employeeCode,
                message: `${employee.name} (${employee.employeeCode}) updated their profile`
            });

            return res.status(200).json({
                message: "Your profile has been updated successfully",
                employee: buildEmployeeProfile(employee)
            });
        }

        const existingPending = await ProfileChangeRequest.findOne({
            employeeCode: employee.employeeCode,
            status: "PENDING"
        });

        if (existingPending) {
            return res.status(409).json({
                message:
                    "You already have a pending profile change request awaiting approval"
            });
        }

        const request = await ProfileChangeRequest.create({
            employeeCode: employee.employeeCode,
            employeeName: employee.name,
            email: employee.email,
            requestedChanges
        });

        if (!request) {
            throw new Error("Failed to create profile change request");
        }

        try {
            const admins = await User.find({
                roles: { $in: ["ADMIN", "OWNER"] },
                status: "ACTIVE"
            }).select("email");

            const adminEmails = admins.map((a) => a.email);

            if (adminEmails.length) {
                await sendEmail({
                    to: adminEmails,
                    ...emailTemplates.profileChangeRequest({
                        name: employee.name,
                        employeeCode: employee.employeeCode
                    })
                });
            }
        } catch (emailError) {
            console.error("Admin notification email error:", emailError);
        }

        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "PROFILE_CHANGE_REQUESTED",
            targetType: "PROFILE_CHANGE_REQUEST",
            targetId: request.requestId,
            message: `${employee.name} (${employee.employeeCode}) requested a profile change`
        });

        return res.status(201).json({
            message:
                "Your profile change request has been submitted for approval",
            request: {
                requestId: request.requestId,
                status: request.status,
                requestedChanges
            }
        });
    }
    catch (err) {
        console.error("Error during profile update request: ", err);
        return res.status(500).json({
            message: "Server error during profile update request"
        });
    }
};