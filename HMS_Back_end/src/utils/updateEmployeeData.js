const sanitizeQualifications = require("./qualificationSanitizer");
const { SPECIALIZATION_DESIGNATIONS_SET } = require("../constants/domain");

const doctorOnlyFields = new Set(["consultationFee", "availabilitySlots"]);
const updateEmployeeData = (employee, updateData) => {
  const allowedFields = [
    "name",
    "phone",
    "department",
    "designation",
    "joiningDate",
    "qualification",
    "medicalRegistrationNumber",
    "specialization",
    "consultationFee",
    "availabilitySlots",
  ];

  const updatedDesignation = updateData.designation || employee.designation;
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      if (field === "qualification") {
        employee[field] = sanitizeQualifications(updateData[field]);

        return;
      }

      if (
        field === "specialization" &&
        !SPECIALIZATION_DESIGNATIONS_SET.has(updatedDesignation)
      ) {
        return;
      }
      if (doctorOnlyFields.has(field) && updatedDesignation !== "DOCTOR") {
        return;
      }

      employee[field] = updateData[field];
    }
  });
  if (!SPECIALIZATION_DESIGNATIONS_SET.has(updatedDesignation)) {
    employee.specialization = undefined;
  }

  if (updatedDesignation !== "DOCTOR") {
    employee.consultationFee = undefined;
    employee.availabilitySlots = undefined;
  }

  return employee;
};

module.exports = updateEmployeeData;