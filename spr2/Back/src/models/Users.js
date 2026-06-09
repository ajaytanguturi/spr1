const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        passwordHash: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ["ACTIVE", "INACTIVE", "PENDING", "REJECTED"],
            default: "PENDING"
        },
        roles: [{
            type: String,
            enum: ["OWNER", "ADMIN", "STAFF"],
            required: true
        }],
        employeeCode: {
            type: String,
            required: true
        },
        mustChangePassword: {
            type: Boolean,
            default: false
        },
        createdByAdmin: {
            type: Boolean,
            default: false
        },
        approvedBy: {
            type: String,
            default: null
        },
        approvedAt: {
            type: Date,
            default: null
        },
        createdBy: {
            type: String,
            default: null
        },
        resetPasswordTokenHash: {
            type: String,
            default: null
        },
        resetPasswordTokenExpiry: {
            type: Date,
            default: null
        },
        lastLoginAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: 'created_at', updatedAt: 'updated_at'
        }
    }
);

module.exports = mongoose.model("User", userSchema);