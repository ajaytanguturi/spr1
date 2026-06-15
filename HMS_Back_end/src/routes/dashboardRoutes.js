const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const authorizeDesignation = require("../middlewares/authorizeDesignations");
const controller = require("../controllers/dashboardController");

router.use(auth);

router.get(
    "/stats",
    controller.getDashboardStats
);

router.get(
    "/admin/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getAdminDashboardStats
);

router.get(
    "/doctor/stats",
    authorizeDesignation("DOCTOR"),
    controller.getDoctorDashboardStats
);

router.get(
    "/receptionist/stats",
    authorizeDesignation("RECEPTIONIST"),
    controller.getReceptionistDashboardStats
);

router.get(
    "/appointments/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getAppointmentStats
);

router.get(
    "/patients/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getPatientStats
);

router.get(
    "/employees/stats",
    authorizeDesignation("OWNER", "ADMIN"),
    controller.getEmployeeStats
);

module.exports = router;