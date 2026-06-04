const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
    patientId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, default: null },
    gender: { type: String, enum: ["male", "female", "other"], required: true },
    date_of_birth: { type: Date },
    emergencyContact: { type: String, default: null },
    address: {
        type: String
    },
    status: {
        type: String,
        enum: [
            "ACTIVE",
            "INACTIVE"
        ],
        default: "ACTIVE"
    }
}, {
    timestamps: {
        createdAt: "created_at",
    }
});

patientSchema.pre('save', async function (next) {
    if (this.isNew) {
        try {
            const counter = await Counter.findOneAndUpdate(
                { name: 'Patient' },
                { $inc: { seq: 1 } }, // Creates sequence
                { new: true, upsert: true } // upsert is update and insert
            );
            this.patientId = `UHID-${String(counter.seq).padStart(6, '0')}`; // create 6 digit sequence number
        } catch (err) {
            return next(err);
        }
    }
    next();
});
module.exports = mongoose.model("Patient", patientSchema);