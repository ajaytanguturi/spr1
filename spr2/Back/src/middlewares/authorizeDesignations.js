const Employee = require("../models/Employees");

const authorizeDesignation = (...allowedDesignations) => {

    return async (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized access"
            });
        }

        const employee = await Employee.findOne({
            employeeCode: req.user.employeeCode
        });

        if (!employee) {
            return res.status(403).json({
                message: "Unauthorized access"
            });
        }

        const hasPermission = allowedDesignations.includes(employee.designation)

        if (!hasPermission) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        next();
    };
};

module.exports = authorizeDesignation;