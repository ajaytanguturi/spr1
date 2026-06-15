const express = require("express");
const router = express.Router();
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/patientController");
const {
    createPatientValidation,
    updatePatientValidation,
    uhidValidation
} = require("../validators/patientValidators");

router.use(auth, authorizeDesignation("OWNER", "ADMIN", "RECEPTIONIST"));

router.post(
    "/create-patient",
    createPatientValidation,
    validate,
    controller.createPatient
);

router.get(
    "/search",
    controller.searchPatients
);

router.get(
    "/",
    controller.getPatients
);

router.get(
    "/:UHID",
    uhidValidation,
    validate,
    controller.getPatientById
);

router.put(
    "/:UHID",
    updatePatientValidation,
    validate,
    controller.updatePatient
);

module.exports = router;