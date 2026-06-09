const User = require("../models/Users");
const Employee = require("../models/Employees");
const { MEDICAL_DESIGNATIONS_SET } = require("../config/constants");

const validateUniqueEmployeeFields = async (data) => {
    const {
        username,
        email,
        designation,
        medicalRegistrationNumber
    } = data;

    const existingUsername = await User.findOne({
        username
    });

    if (existingUsername) {
        return {
            success: false,
            status: 409,
            message: "Username already exists"
        };
    }

    const existingUserEmail = await User.findOne({
        email
    });

    if (existingUserEmail) {
        return {
            success: false,
            status: 409,
            message: "User with this email already exists"
        };
    }
    const existingEmployeeEmail = await Employee.findOne({
        email
    });

    if (existingEmployeeEmail) {
        return {
            success: false,
            status: 409,
            message: "Employee with this email already exists"
        };
    }
    if (MEDICAL_DESIGNATIONS_SET.has(designation)) {
        const existingMedicalEmployee = await Employee.findOne({
            medicalRegistrationNumber
        });

        if (existingMedicalEmployee) {
            return {
                success: false,
                status: 409,
                message: "Employee with this medical registration number already exists"
            };
        }
    }

    return {
        success: true
    };
}

module.exports = validateUniqueEmployeeFields;