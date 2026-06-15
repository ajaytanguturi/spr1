const Employee = require("../models/Employees");
const User = require("../models/Users");
const emailTemplates = require("../utils/emailTemplates");
const buildEmployeeResponse = require("../utils/buildEmployeeResponse");
const updateEmployeeData = require("../utils/updateEmployeeData");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const createAccountWithEmployee = require("../utils/createAccountWithEmployee");
const deleteEmployeeAccount = require("../utils/deleteEmployeeAccount");
const cancelDoctorAppointments = require("../utils/cancelDoctorAppointments");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const createAdmin = async (req, res) => {
  const { employee, user } = await createAccountWithEmployee(req, { // NOSONAR: false positive; function is async but Sonar loses type info across CommonJS require
    roles: ["ADMIN"],
    emailTemplate: emailTemplates.adminCredentials,
    auditAction: "ADMIN_CREATED",
    buildAuditMessage: (emp) =>
      MESSAGES.AUDIT.ADMIN_CREATED(emp.name, emp.employeeCode),
  });

  return sendSuccess(res, STATUS.CREATED, MESSAGES.OWNER.ADMIN_CREATED, {
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      email: employee.email,
      designation: employee.designation,
    },
    user: {
      username: user.username,
      roles: user.roles,
      status: user.status,
    },
  });
};
const getAdmins = async (req, res) => {
  const admins = await User.find({
    roles: "ADMIN",
  }).select("-passwordHash");

  const employeeCodes = admins.map((admin) => admin.employeeCode);

  const employees = await Employee.find({
    employeeCode: {
      $in: employeeCodes,
    },
  });

  const formattedAdmins = buildEmployeeResponse(employees, admins);

  return sendSuccess(res, STATUS.OK, MESSAGES.OWNER.ADMINS_RETRIEVED, {
    totalAdmins: formattedAdmins.length,
    admins: formattedAdmins,
  });
};

const updateAdmin = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.OWNER.ADMIN_NOT_FOUND);
  }

  updateEmployeeData(employee, req.body);

  await employee.save();

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "ADMIN_UPDATED",
    targetType: "EMPLOYEE",
    targetId: employee.employeeCode,
    message: MESSAGES.AUDIT.ADMIN_UPDATED(employee.name, employee.employeeCode)
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.OWNER.ADMIN_UPDATED, {
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
    },
  });
};
const deleteAdmin = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.OWNER.ADMIN_NOT_FOUND);
  }

  if (employee.designation === "OWNER") {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.OWNER.CANNOT_DELETE_OWNER);
  }

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "ADMIN_DELETED",
    targetType: "EMPLOYEE",
    targetId: employeeCode,
    message: MESSAGES.AUDIT.ADMIN_DELETED(employee.name, employeeCode)
  });

  await cancelDoctorAppointments(employeeCode, employee.name, actor);
  await deleteEmployeeAccount(employeeCode);

  return sendSuccess(res, STATUS.OK, MESSAGES.OWNER.ADMIN_DELETED);
};

module.exports = {
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
};
