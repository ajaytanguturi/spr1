const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const signupValidation = [
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
        .isLength({ min: 8 })
        .withMessage("Password must be at least 8 characters"),
    body("designation")
        .isIn(["OWNER", "ADMIN", "DOCTOR", "RECEPTIONIST", "CASHIER", "NURSE", "LAB_TECH", "PHARMACIST"])
        .withMessage("Role mismatch"),
    body("phone")
        .matches(/^[6-9]\d{9}$/)
        .withMessage("Phone number should be min 10 digits"),
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("department").isIn(["OPD", "IPD", "Lab", "Pharmacy", "Admin"]).withMessage("Invalid Department")
];


const loginValidation = [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
];
module.exports = { signupValidation, loginValidation };