const User = require("../models/Users");
const Employee = require("../models/Employees");
const AuditLog = require("../models/AuditLogs");
const ProfileChangeRequest = require("../models/ProfileChangeRequests");
const emailTemplates = require("../utils/emailTemplates");
const sendEmail = require("../utils/sendEmail");
const buildEmployeeResponse = require("../utils/buildEmployeeResponse");
const buildEmployeeProfile = require("../utils/buildEmployeeProfile");
const updateEmployeeData = require("../utils/updateEmployeeData");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const deleteEmployeeAccount = require("../utils/deleteEmployeeAccount");
const cancelDoctorAppointments = require("../utils/cancelDoctorAppointments");
const createAccountWithEmployee = require("../utils/createAccountWithEmployee");
const parsePagination = require("../utils/parsePagination");
const { RESTRICTED_ROLES_SET } = require("../constants/domain");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const getEmployeesByStatus = async (status, res) => {
  const users = await User.find({ roles: "STAFF", status }).select("-passwordHash");
  const employeeCodes = users.map((user) => user.employeeCode);
  const employees = await Employee.find({ employeeCode: { $in: employeeCodes } });
  const formattedEmployees = buildEmployeeResponse(employees, users);
  return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.LIST_RETRIEVED, {
    totalEmployees: formattedEmployees.length,
    employees: formattedEmployees,
  });
};

const findPendingRequest = async (requestId) => {
  const request = await ProfileChangeRequest.findOne({ requestId });
  if (!request) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.ADMIN.CHANGE_REQUEST_NOT_FOUND);
  }
  if (String(request.status) !== "PENDING") {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.ADMIN.CHANGE_REQUEST_REVIEWED);
  }
  return request;
};

exports.createEmployee = async (req, res) => {
  const { designation } = req.body;

  if (RESTRICTED_ROLES_SET.has(designation)) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.AUTH.INVALID_DESIGNATION);
  }

  const { employee, user } = await createAccountWithEmployee(req, { // NOSONAR: false positive; function is async but Sonar loses type info across CommonJS require
    roles: ["STAFF"],
    emailTemplate: emailTemplates.employeeCredentials,
    auditAction: "EMPLOYEE_CREATED",
    buildAuditMessage: (emp) =>
      MESSAGES.AUDIT.EMPLOYEE_CREATED(emp.name, emp.employeeCode, emp.designation),
  });

  return sendSuccess(res, STATUS.CREATED, MESSAGES.ADMIN.EMPLOYEE_CREATED, {
    user: {
      username: user.username,
      email: user.email,
      roles: user.roles,
    },
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
    },
  });
};

exports.getEmployee = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({ employeeCode });
  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  const user = await User.findOne({ employeeCode }).select("-passwordHash");
  if (!user) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
  }

  const profile = buildEmployeeProfile(employee);

  return sendSuccess(res, STATUS.OK, MESSAGES.EMPLOYEE.RETRIEVED, {
    employee: profile,
    status: user.status,
    roles: user.roles,
    lastLoginAt: user.lastLoginAt,
  });
};

exports.getEmployees = async (req, res) =>
  getEmployeesByStatus("ACTIVE", res);

exports.getPendingEmployees = async (req, res) =>
  getEmployeesByStatus("PENDING", res);

exports.approveEmployee = async (req, res) => {
  const employeeCode = req.params.employeeCode;

  const user = await User.findOne({
    employeeCode,
  });

  if (!user) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
  }

  if (user.roles.some((role) => RESTRICTED_ROLES_SET.has(role))) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.ONLY_STAFF_APPROVED);
  }

  if (String(user.status) !== "PENDING") {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.ADMIN.STATUS_NOT_PENDING);
  }

  user.status = "ACTIVE";
  user.approvedBy = req.user.employeeCode;
  user.approvedAt = new Date();

  await user.save();
  try {
    await sendEmail({
      to: user.email,
      ...emailTemplates.accountApproved(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "EMPLOYEE_APPROVED",
    targetType: "EMPLOYEE",
    targetId: user.employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_APPROVED(user.employeeCode, user.username)
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.ACCOUNT_APPROVED, {
    user: {
      username: user.username,
      email: user.email,
    },
  });
};

exports.rejectEmployee = async (req, res) => {
  const employeeCode = req.params.employeeCode;

  const user = await User.findOne({
    employeeCode,
  });

  if (!user) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.AUTH.USER_NOT_FOUND);
  }

  if (user.roles.some((role) => RESTRICTED_ROLES_SET.has(role))) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.ONLY_STAFF_REJECTED);
  }

  if (String(user.status) !== "PENDING") {
    throw new AppError(STATUS.BAD_REQUEST, MESSAGES.ADMIN.STATUS_NOT_PENDING);
  }

  try {
    await sendEmail({
      to: user.email,
      ...emailTemplates.accountRejected(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  const actor = await resolveActor(req.user);

  await recordAudit({
    actor,
    action: "EMPLOYEE_REJECTED",
    targetType: "EMPLOYEE",
    targetId: employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_REGISTRATION_REJECTED(employeeCode, user.username),
  });

  await deleteEmployeeAccount(employeeCode);

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.REGISTRATION_REJECTED);
};

exports.updateEmployee = async (req, res) => {
  const { employeeCode } = req.params;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  if (RESTRICTED_ROLES_SET.has(employee.designation)) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.CANNOT_UPDATE_PRIVILEGED);
  }

  updateEmployeeData(employee, req.body);

  await employee.save();

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "EMPLOYEE_UPDATED",
    targetType: "EMPLOYEE",
    targetId: employee.employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_UPDATED(employee.name, employee.employeeCode)
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.EMPLOYEE_UPDATED, {
    employee: {
      employeeCode: employee.employeeCode,
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
    },
  });
};
exports.deleteEmployee = async (req, res) => {

  const employeeCode = req.params.employeeCode;

  const employee = await Employee.findOne({
    employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  if (RESTRICTED_ROLES_SET.has(employee.designation)) {
    throw new AppError(STATUS.FORBIDDEN, MESSAGES.ADMIN.CANNOT_DELETE_PRIVILEGED);
  }

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "EMPLOYEE_DELETED",
    targetType: "EMPLOYEE",
    targetId: employeeCode,
    message: MESSAGES.AUDIT.EMPLOYEE_DELETED(employee.name, employeeCode)
  });

  await cancelDoctorAppointments(employeeCode, employee.name, actor);
  await deleteEmployeeAccount(employeeCode);

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.EMPLOYEE_DELETED);
};

exports.getAuditLogs = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, 20);

  const filter = {};

  if (req.query.action) {
    filter.action = req.query.action;
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .select("-__v")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.AUDIT_LOGS_RETRIEVED, {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    logs,
  });
};

exports.getProfileChangeRequests = async (req, res) => {
  const requests = await ProfileChangeRequest.find({
    status: "PENDING",
  })
    .select("-__v")
    .sort({ created_at: -1 })
    .lean();

  const formatted = requests.map((request) => ({
    ...request,
    requestedChanges: request.requestedChanges || {},
  }));

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.CHANGE_REQUESTS_RETRIEVED, {
    total: formatted.length,
    requests: formatted,
  });
};

exports.approveProfileChange = async (req, res) => {
  const { requestId } = req.params;

  const request = await findPendingRequest(requestId);

  const employee = await Employee.findOne({
    employeeCode: request.employeeCode,
  });

  if (!employee) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.EMPLOYEE.NOT_FOUND);
  }

  request.requestedChanges.forEach((change, field) => {
    employee[field] = change.new;
  });

  await employee.save();

  request.status = "APPROVED";
  request.reviewedBy = req.user.employeeCode;
  request.reviewedAt = new Date();
  await request.save();

  try {
    await sendEmail({
      to: employee.email,
      ...emailTemplates.profileChangeApproved(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "PROFILE_CHANGE_APPROVED",
    targetType: "PROFILE_CHANGE_REQUEST",
    targetId: request.requestId,
    message: MESSAGES.AUDIT.PROFILE_CHANGE_APPROVED(
      request.requestId,
      employee.name,
      employee.employeeCode
    ),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.CHANGE_REQUEST_APPROVED, {
    request: {
      requestId: request.requestId,
      status: request.status,
    },
  });
};

exports.rejectProfileChange = async (req, res) => {
  const { requestId } = req.params;

  const request = await findPendingRequest(requestId);

  request.status = "REJECTED";
  request.reviewedBy = req.user.employeeCode;
  request.reviewedAt = new Date();
  await request.save();

  try {
    await sendEmail({
      to: request.email,
      ...emailTemplates.profileChangeRejected(),
    });
  } catch (emailError) {
    console.error("Email sending error:", emailError);
  }

  const actor = await resolveActor(req.user);
  await recordAudit({
    actor,
    action: "PROFILE_CHANGE_REJECTED",
    targetType: "PROFILE_CHANGE_REQUEST",
    targetId: request.requestId,
    message: MESSAGES.AUDIT.PROFILE_CHANGE_REJECTED(
      request.requestId,
      request.employeeName,
      request.employeeCode
    ),
  });

  return sendSuccess(res, STATUS.OK, MESSAGES.ADMIN.CHANGE_REQUEST_REJECTED, {
    request: {
      requestId: request.requestId,
      status: request.status,
    },
  });
};
