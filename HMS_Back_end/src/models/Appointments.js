const mongoose = require("mongoose");
const Counter = require("./Counter");

const appointmentSchema = new mongoose.Schema({
    appointmentId: {
        type: String,
        unique: true
    },
    patientId: {
        type: String,
        required: true,
        ref: "Patients"
    },
    doctorEmployeeId: {
        type: String,
        required: true,
        ref: "Employee"
    },
    appointmentDate: {
        type: Date,
        required: true
    },
    timeSlot: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["PENDING_REVIEW", "BOOKED", "CANCELED", "COMPLETED", "REJECTED"],
        default: "BOOKED"
    },
    bookingSource: {
        type: String,
        enum: ["PATIENT", "STAFF"],
        default: "STAFF",
    },
    cancellationReason: {
        type: String,
        default: null
    },
    rejectionReason: {
        type: String,
        default: null,
    },
    createdByEmployeeId: {
        type: String,
        ref: "Employee"
    },
    approvedByEmployeeId: {
        type: String,
        ref: "Employee",
    },
    approvedAt: {
        type: Date
    },
}, {
    timestamps: {
        createdAt: "created_at",
        updatedAt: "updated_at",
    },
}
);

appointmentSchema.pre('save', async function () {
    if (this.isNew) {
        const counter = await Counter.findOneAndUpdate(
            { name: 'appointments' },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );
        this.appointmentId = `APT-${String(counter.seq).padStart(6, '0')}`;
    }
});

module.exports = mongoose.model("Appointments", appointmentSchema);