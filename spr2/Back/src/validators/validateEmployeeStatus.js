const Employee = require("../models/Employees");
const User = require("../models/Users");

const validateEmployeeStatus = async (employeeCode, expectedDesignation) => {

    const employee = await Employee.findOne({
        employeeCode: employeeCode
    });

    if (!employee) {
        return {
            success: false,
            status: 404,
            message: "Employee doesn't exist"
        };
    }

    const user = await User.findOne({
        employeeCode
    });

    if (!user) {
        return {
            success: false,
            status: 404,
            message: "User doesn't exist"
        };
    }

    if (employee.designation !== expectedDesignation) {
        return {
            success: false,
            status: 400,
            message: "The selected employee is not a " + expectedDesignation
        };
    }
    if (String(user.status) !== "ACTIVE") {
        return {
            success: false,
            status: 403,
            message: expectedDesignation + " account is inactive"
        };
    }

    return {
        success: true,
        employee
    };
}

module.exports = validateEmployeeStatus;