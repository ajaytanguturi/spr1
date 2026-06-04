const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
    appointmentId: { type: String, unique: true },
    patientId: {
        type: String,
        ref: "Patient",
        required: true
    },
    doctorEmployeeId: {
        type: String,
        ref: "Employee",
        required: true
    },
    date: { type: Date, required: true },
    timeSlot: { type: String, required: true, match: [/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'Format must be HH:mm-HH:mm'] },
    status: { type: String, enum: ["Booked", "Completed", "Cancelled"], required: true, default: "Booked" },
    purpose: { type: String, required: true },
    createdBy: {
        type: String,
        ref: "Employee",
        required: true
    }
}, {
    timestamps: {
        createdAt: "created_at",
    }
});

appointmentSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { name: 'Appointment' },
                { $inc: { seq: 1 } }, // Creates sequence
                { new: true, upsert: true } // upsert is update and insert
            );
            this.appointmentId = `APPT-${String(counter.seq).padStart(6, '0')}`; // create 6 digit sequence number
        } catch (err) {
            return next(err);
        }
    }
    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);