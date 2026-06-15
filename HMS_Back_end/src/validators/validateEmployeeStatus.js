const Employee = require("../models/Employees");
const User = require("../models/Users");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const validateEmployeeStatus = async (employeeCode, expectedDesignation) => {

    const employee = await Employee.findOne({
        employeeCode: employeeCode
    });

    if (!employee) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.DOESNT_EXIST);
    }

    const user = await User.findOne({
        employeeCode
    });

    if (!user) {
        throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.USER_DOESNT_EXIST);
    }

    if (employee.designation !== expectedDesignation) {
        throw new AppError(
            STATUS.BAD_REQUEST,
            MESSAGES.EMPLOYEE.NOT_DESIGNATION(expectedDesignation)
        );
    }

    if (String(user.status) !== "ACTIVE") {
        throw new AppError(
            STATUS.FORBIDDEN,
            MESSAGES.EMPLOYEE.DESIGNATION_INACTIVE(expectedDesignation)
        );
    }

    return employee;
};

module.exports = validateEmployeeStatus;
