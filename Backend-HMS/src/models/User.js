const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    passwordHash: { type: String, required: true },
    status: {
        type: String,
        enum: ["ACTIVE", "INACTIVE"],
        default: "ACTIVE"
    },
    isActive: {
        type: Boolean,
        default: false
    },

    verificationToken: String,
    verificationTokenExpiry: Date,
    role: [{
        type: String,
        enum: ["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "CASHIER", "NURSE", "LAB_TECH", "PHARMACIST"],
    }],
    employeeId: {
        type: String,
        ref: "Employee"
    },

    lastLoginAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: {
        createdAt: "created_at",
    }
});

module.exports = mongoose.model("User", userSchema);