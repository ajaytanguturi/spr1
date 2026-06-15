const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const patientAuth = require("../middlewares/patientAuthMiddleware");
const controller = require("../controllers/patientAuthController");
const {
    patientRegisterValidation,
    patientLoginValidation,
    patientChangePasswordValidation,
    patientForgotPasswordValidation,
    patientResetPasswordValidation
} = require("../validators/patientAuthValidators");

router.post(
    "/register",
    patientRegisterValidation,
    validate,
    controller.register
);

router.post(
    "/login",
    patientLoginValidation,
    validate,
    controller.login
);

router.post(
    "/forgot-password",
    patientForgotPasswordValidation,
    validate,
    controller.forgotPassword
);

router.post(
    "/reset-password",
    patientResetPasswordValidation,
    validate,
    controller.resetPassword
);

router.put(
    "/change-password",
    patientAuth,
    patientChangePasswordValidation,
    validate,
    controller.changePassword
);

module.exports = router;
