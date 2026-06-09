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
const { RESTRICTED_ROLES_SET } = require("../config/constants");

const getEmployeesByStatus = async (status, res) => {
  const users = await User.find({ roles: "STAFF", status }).select("-passwordHash");
  const employeeCodes = users.map((user) => user.employeeCode);
  const employees = await Employee.find({ employeeCode: { $in: employeeCodes } });
  const formattedEmployees = buildEmployeeResponse(employees, users);
  return res.status(200).json({
    totalEmployees: formattedEmployees.length,
    employees: formattedEmployees,
  });
};

const findPendingRequest = async (requestId, res) => {
  const request = await ProfileChangeRequest.findOne({ requestId });
  if (!request) {
    res.status(404).json({ message: "Profile change request not found" });
    return null;
  }
  if (String(request.status) !== "PENDING") {
    res.status(400).json({ message: "This request has already been reviewed" });
    return null;
  }
  return request;
};

exports.createEmployee = async (req, res) => {
  const { designation } = req.body;
  try {
    if (RESTRICTED_ROLES_SET.has(designation)) {
      return res.status(403).json({
        message: "Invalid designation. Cannot create admin or owner accounts.",
      });
    }
    const { employee, user } = await createAccountWithEmployee(req, { // NOSONAR: false positive; function is async but Sonar loses type info across CommonJS require
      roles: ["STAFF"],
      emailTemplate: emailTemplates.employeeCredentials,
      auditAction: "EMPLOYEE_CREATED",
      buildAuditMessage: (emp) =>
        `Employee ${emp.name} (${emp.employeeCode}) was created as ${emp.designation}`,
    });
    return res.status(201).json({
      message:
        "Employee account created successfully. Login credentials have been sent via email.",
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
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Employee creation error:", err);
    return res.status(500).json({
      message: "Server error during employee creation",
    });
  }
};

exports.getEmployee = async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const employee = await Employee.findOne({ employeeCode });
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }
    const user = await User.findOne({ employeeCode }).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const profile = buildEmployeeProfile(employee);
    return res.status(200).json({
      employee: profile,
      status: user.status,
      roles: user.roles,
      lastLoginAt: user.lastLoginAt,
    });
  } catch (err) {
    console.error("Get employee error:", err);
    return res.status(500).json({ message: "Server error while fetching employee" });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    await getEmployeesByStatus("ACTIVE", res);
  } catch (err) {
    console.error("Get employees error:", err);
    return res.status(500).json({
      message: "Server error while fetching employees",
    });
  }
};

exports.getPendingEmployees = async (req, res) => {
  try {
    await getEmployeesByStatus("PENDING", res);
  } catch (err) {
    console.error("Get employees error:", err);
    return res.status(500).json({
      message: "Server error while fetching employees",
    });
  }
};

exports.approveEmployee = async (req, res) => {
  try {
    const employeeCode = req.params.employeeCode;
    const user = await User.findOne({
      employeeCode,
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found!!",
      });
    }
    if (user.roles.some((role) => RESTRICTED_ROLES_SET.has(role))) {
      return res.status(403).json({
        message: "Only STAFF accounts can be approved",
      });
    }
    if (String(user.status) !== "PENDING") {
      return res.status(400).json({
        message: "Account status is not pending",
      });
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
      message: `Employee account ${user.employeeCode} (${user.username}) was approved`
    });
    res.status(200).json({
      message: "Employee account approved successfully",
      user: {
        username: user.username,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("Error during approval: ", err);
    return res.status(500).json({
      message: "Server error during approval",
    });
  }
};

exports.rejectEmployee = async (req, res) => {
  try {
    const employeeCode = req.params.employeeCode;
    const user = await User.findOne({
      employeeCode,
    });
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    if (user.roles.some((role) => RESTRICTED_ROLES_SET.has(role))) {
      return res.status(403).json({
        message: "Only STAFF accounts can be rejected",
      });
    }
    if (String(user.status) !== "PENDING") {
      return res.status(400).json({
        message: "Account status is not pending",
      });
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
      message: `Employee registration ${employeeCode} (${user.username}) was rejected`,
    });
    await deleteEmployeeAccount(employeeCode);
    return res.status(200).json({
      message: "Employee registration request rejected successfully",
    });
  } catch (err) {
    console.error("Error during rejection:", err);
    return res.status(500).json({
      message: "Server error during rejection",
    });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { employeeCode } = req.params;
    const employee = await Employee.findOne({
      employeeCode,
    });
    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }
    if (RESTRICTED_ROLES_SET.has(employee.designation)) {
      return res.status(403).json({
        message: "Cannot update OWNER or ADMIN accounts",
      });
    }
    updateEmployeeData(employee, req.body);
    await employee.save();
    const actor = await resolveActor(req.user);
    await recordAudit({
      actor,
      action: "EMPLOYEE_UPDATED",
      targetType: "EMPLOYEE",
      targetId: employee.employeeCode,
      message: `Employee ${employee.name} (${employee.employeeCode}) was updated`
    });
    return res.status(200).json({
      message: "Employee updated successfully",
      employee: {
        employeeCode: employee.employeeCode,
        name: employee.name,
        department: employee.department,
        designation: employee.designation,
      },
    });
  } catch (err) {
    console.error("Error during employee update:", err);
    return res.status(500).json({
      message: "Server error during employee update",
    });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const employeeCode = req.params.employeeCode;

    const employee = await Employee.findOne({
      employeeCode,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (RESTRICTED_ROLES_SET.has(employee.designation)) {
      return res.status(403).json({
        message: "Cannot delete OWNER or ADMIN accounts",
      });
    }

    const actor = await resolveActor(req.user);
    await recordAudit({
      actor,
      action: "EMPLOYEE_DELETED",
      targetType: "EMPLOYEE",
      targetId: employeeCode,
      message: `Employee ${employee.name} (${employeeCode}) was deleted`
    });

    await cancelDoctorAppointments(employeeCode, employee.name, actor);
    await deleteEmployeeAccount(employeeCode);

    return res.status(200).json({
      message: "Employee deleted successfully",
    });
  } catch (err) {
    console.error("Error during employee deletion:", err);
    return res.status(500).json({
      message: "Server error during employee deletion",
    });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
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

    return res.status(200).json({
      message: "Audit logs retrieved successfully",
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs,
    });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    return res.status(500).json({
      message: "Server error while fetching audit logs",
    });
  }
};

exports.getProfileChangeRequests = async (req, res) => {
  try {
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

    return res.status(200).json({
      message: "Profile change requests retrieved successfully",
      total: formatted.length,
      requests: formatted,
    });
  } catch (err) {
    console.error("Error fetching profile change requests:", err);
    return res.status(500).json({
      message: "Server error while fetching profile change requests",
    });
  }
};

exports.approveProfileChange = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await findPendingRequest(requestId, res);
    if (!request) return;

    const employee = await Employee.findOne({
      employeeCode: request.employeeCode,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
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
      message: `Profile change ${request.requestId} for ${employee.name} (${employee.employeeCode}) was approved`,
    });

    return res.status(200).json({
      message: "Profile change request approved successfully",
      request: {
        requestId: request.requestId,
        status: request.status,
      },
    });
  } catch (err) {
    console.error("Error approving profile change:", err);
    return res.status(500).json({
      message: "Server error during profile change approval",
    });
  }
};

exports.rejectProfileChange = async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await findPendingRequest(requestId, res);
    if (!request) return;

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
      message: `Profile change ${request.requestId} for ${request.employeeName} (${request.employeeCode}) was rejected`,
    });

    return res.status(200).json({
      message: "Profile change request rejected successfully",
      request: {
        requestId: request.requestId,
        status: request.status,
      },
    });
  } catch (err) {
    console.error("Error rejecting profile change:", err);
    return res.status(500).json({
      message: "Server error during profile change rejection",
    });
  }
};