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

const createAdmin = async (req, res) => {
  try {
    const { employee, user } = await createAccountWithEmployee(req, { 
      roles: ["ADMIN"],
      emailTemplate: emailTemplates.adminCredentials,
      auditAction: "ADMIN_CREATED",
      buildAuditMessage: (emp) =>
        `Admin account created for ${emp.name} (${emp.employeeCode})`,
    });

    return res.status(201).json({
      message: "Admin account created successfully. Credentials sent via email.",
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
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }
    console.error("Error during admin creation: ", err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const getAdmins = async (req, res) => {
  try {
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

    return res.status(200).json({
      totalAdmins: formattedAdmins.length,
      admins: formattedAdmins,
    });
  } catch (err) {
    console.error("Error during admin retrieval: ",err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { employeeCode } = req.params;

    const employee = await Employee.findOne({
      employeeCode,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    updateEmployeeData(employee, req.body);

    await employee.save();
    const actor = await resolveActor(req.user);
    await recordAudit({
      actor,
      action: "ADMIN_UPDATED",
      targetType: "EMPLOYEE",
      targetId: employee.employeeCode,
      message: `Admin ${employee.name} (${employee.employeeCode}) was updated`
    });

    return res.status(200).json({
      message: "Admin updated successfully",
      employee: {
        employeeCode: employee.employeeCode,
        name: employee.name,
        department: employee.department,
        designation: employee.designation,
      },
    });
  } catch (err) {
    console.error("Error during admin update:", err);
    return res.status(500).json({
      message: "Server error during admin update",
    });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { employeeCode } = req.params;

    const employee = await Employee.findOne({
      employeeCode,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (employee.designation === "OWNER") {
      return res.status(403).json({
        message: "Owner account cannot be deleted",
      });
    }

    const actor = await resolveActor(req.user);
    await recordAudit({
      actor,
      action: "ADMIN_DELETED",
      targetType: "EMPLOYEE",
      targetId: employeeCode,
      message: `Admin ${employee.name} (${employeeCode}) was deleted`
    });

    await cancelDoctorAppointments(employeeCode, employee.name, actor);
    await deleteEmployeeAccount(employeeCode);

    return res.status(200).json({
      message: "Admin deleted successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

module.exports = {
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
};