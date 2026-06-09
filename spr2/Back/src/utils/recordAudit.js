const AuditLog = require("../models/AuditLogs");

const recordAudit = async ({
    actor = {},
    action,
    targetType,
    targetId,
    message
}) => {
    try {
        await AuditLog.create({
            actorEmployeeCode: actor.employeeCode,
            actorName: actor.name,
            actorDesignation: actor.designation,
            action,
            targetType,
            targetId,
            message
        });
    } catch (err) {
        console.error("Audit log error:", err.message);
    }
};

module.exports = recordAudit;