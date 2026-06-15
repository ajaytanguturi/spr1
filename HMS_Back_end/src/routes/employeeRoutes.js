const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/employeeController");
const { phoneValidator } = require("../validators/sharedValidators");
const { qualificationValidator } = require("../validators/employeeValidation");

router.use(auth);

const profileUpdateValidation = [
    phoneValidator("phone", { optional: true }),
    qualificationValidator("qualification", { optional: true })
];

router.get(
    "/me",
    controller.getMe
);

router.get(
    "/doctors",
    authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST"),
    controller.getDoctors
);

router.put(
    "/update-profile",
    profileUpdateValidation,
    validate,
    controller.profileUpdate
);

module.exports = router;