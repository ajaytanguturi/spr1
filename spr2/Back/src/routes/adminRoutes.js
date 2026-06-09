const express = require("express");
const router = express.Router();
const { param } = require("express-validator");
const validate = require("../middlewares/validate");
const auth = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/authorizeRolesMiddleware");
const controller = require("../controllers/adminController");
const {
  employeeBaseValidators,
  joiningDateValidator,
} = require("../validators/employeeValidation");
const { nameValidator } = require("../validators/sharedValidators");

router.use(auth, authorizeRoles("OWNER", "ADMIN"));

const employeeCreationValidation = [
  ...employeeBaseValidators,
  joiningDateValidator(),
];

const employeeCodeValidation = [
  param("employeeCode").notEmpty().withMessage("Employee Code is required"),
];

const employeeUpdateValidation = [
  ...employeeCodeValidation,
  nameValidator("name", "Name", { optional: true }),
];

const requestIdValidation = [
  param("requestId").notEmpty().withMessage("Request ID is required"),
];

router.post(
  "/create-employee",
  employeeCreationValidation,
  validate,
  controller.createEmployee,
);

router.get("/employees", controller.getEmployees);

router.get(
  "/employees/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.getEmployee,
);

router.get("/pending-employees", controller.getPendingEmployees);

router.put(
  "/approve-employee/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.approveEmployee,
);

router.put(
  "/reject-employee/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.rejectEmployee,
);

router.put(
  "/update-employee/:employeeCode",
  employeeUpdateValidation,
  validate,
  controller.updateEmployee,
);

router.delete(
  "/delete-employee/:employeeCode",
  employeeCodeValidation,
  validate,
  controller.deleteEmployee,
);

router.get("/audit-logs", controller.getAuditLogs);

router.get("/profile-change-requests", controller.getProfileChangeRequests);

router.put(
  "/approve-profile-change/:requestId",
  requestIdValidation,
  validate,
  controller.approveProfileChange,
);

router.put(
  "/reject-profile-change/:requestId",
  requestIdValidation,
  validate,
  controller.rejectProfileChange,
);

module.exports = router;