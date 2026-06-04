const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const signupValidation = [
    body("email").notEmpty().isEmail().normalizeEmail().toLowerCase().withMessage("Valid email required"),
    body("password")
        .notEmpty().withMessage("Password is Required")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters long")
        .matches(/[A-Z]/)
        .withMessage("Password must contain at least one uppercase letter")
        .matches(/[a-z]/)
        .withMessage("Password must contain at least one lowercase letter")
        .matches(/\d/)
        .withMessage("Password must contain at least one number")
        .matches(/[^A-Za-z0-9]/)
        .withMessage("Password must contain at least one special character"),
    body("designation")
        .notEmpty()
        .toUpperCase()
        .isIn(["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "CASHIER", "NURSE", "LAB_TECH", "PHARMACIST"])
        .withMessage("Role mismatch"),
    body("phone")
        .trim()
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Phone number should exactly 10 digits starting with 6-9"),
    body("name").trim().notEmpty().matches(/^[A-Za-z\s]+$/).withMessage("Name is required"),
    body("department").isIn(["OPD", "IPD", "Lab", "Pharmacy", "Admin"]).withMessage("Invalid Department"),
    body("medicalRegistrationNumber").custom((value, { req }) => {
        if (
            ["DOCTOR", "NURSE", "LAB_TECH", "PHARMACIST"].includes(req.body.designation) &&
            !value
        ) {
            throw new Error(
                "Medical registration number is required for this role"
            );
        }
        if (
            !["DOCTOR", "NURSE", "LAB_TECH", "PHARMACIST"].includes(req.body.designation) &&
            value
        ) {
            throw new Error(
                "Medical registration number is available only for medical-based roles"
            );
        }
        if (value && typeof value !== "string") {
            throw new Error(
                "Medical registration number must be a string"
            );
        }
        return true;
    }),
];

const loginValidation = [
    body("email").notEmpty().isEmail().toLowerCase().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
];
module.exports = { signupValidation, loginValidation };