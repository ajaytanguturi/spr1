const mongoose = require("mongoose");
const Counter = require("./Counter");

const auditActions = [
    "EMPLOYEE_CREATED",
    "EMPLOYEE_APPROVED",
    "EMPLOYEE_REJECTED",
    "EMPLOYEE_UPDATED",
    "EMPLOYEE_DELETED",
    "ADMIN_CREATED",
    "ADMIN_UPDATED",
    "ADMIN_DELETED",
    "PATIENT_CREATED",
    "PATIENT_UPDATED",
    "APPOINTMENT_CREATED",
    "APPOINTMENT_CANCELED",
    "APPOINTMENT_COMPLETED",
    "PROFILE_CHANGE_REQUESTED",
    "PROFILE_CHANGE_APPROVED",
    "PROFILE_CHANGE_REJECTED",
    "PROFILE_UPDATED"
];

const auditLogSchema = new mongoose.Schema(
    {
        auditId: {
            type: String,
            unique: true
        },
        actorEmployeeCode: {
            type: String
        },
        actorName: {
            type: String
        },
        actorDesignation: {
            type: String
        },
        action: {
            type: String,
            enum: auditActions,
            required: true
        },
        targetType: {
            type: String
        },
        targetId: {
            type: String
        },
        message: {
            type: String,
            required: true
        }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

auditLogSchema.pre("save", async function () {
    if (this.isNew) {
        const counter = await Counter.findOneAndUpdate(
            { name: "auditlogs" },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        this.auditId = `AUD-${String(counter.seq).padStart(6, "0")}`;
    }
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
module.exports.AUDIT_ACTIONS = auditActions;
