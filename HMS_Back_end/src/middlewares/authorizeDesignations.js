const Employee = require("../models/Employees");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const authorizeDesignation = (...allowedDesignations) => {

    return async (req, res, next) => {
        if (!req.user) {
            throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.UNAUTHORIZED);
        }
        const employee = await Employee.findOne({
            employeeCode: req.user.employeeCode
        });
        if (!employee) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.UNAUTHORIZED);
        }
        const hasPermission = allowedDesignations.includes(employee.designation);
        if (!hasPermission) {
            throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.ACCESS_DENIED);
        }
        next();
    };
};

module.exports = authorizeDesignation;
