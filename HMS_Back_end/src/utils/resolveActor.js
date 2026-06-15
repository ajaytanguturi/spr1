const Employee = require("../models/Employees");

const resolveActor = async (reqUser) => {
    const employeeCode = reqUser?.employeeCode;

    if (!employeeCode) {
        return {};
    }

    try {
        const employee = await Employee.findOne({ employeeCode }).select(
            "name designation"
        );

        return {
            employeeCode,
            name: employee?.name,
            designation: employee?.designation
        };
    } catch (err) {
        console.error("resolveActor error:", err.message);
        return { employeeCode };
    }
};

module.exports = resolveActor;