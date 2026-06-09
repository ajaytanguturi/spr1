const User = require("../models/Users");
const Employee = require("../models/Employees");
const buildEmployeeProfile = require("./buildEmployeeProfile");

async function getCurrentUser(employeeCode, res) {
    const user = await User.findOne({ employeeCode })
        .select("-passwordHash -resetPasswordTokenHash -resetPasswordTokenExpiry -__v");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const employee = await Employee.findOne({ employeeCode: user.employeeCode }).select("-__v");

    if (!employee) {
        return res.status(404).json({ message: "Employee profile not found" });
    }

    const profile = buildEmployeeProfile(employee);

    return res.status(200).json({
        message: "User retrieved successfully",
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

module.exports = getCurrentUser;