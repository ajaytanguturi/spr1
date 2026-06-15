const { MEDICAL_DESIGNATIONS_SET, SPECIALIZATION_DESIGNATIONS_SET } = require("../constants/domain");

const buildEmployeeProfile = (employee) => {
    const profile = {
        employeeCode: employee.employeeCode,
        name: employee.name,
        phone: employee.phone,
        email: employee.email,
        department: employee.department,
        designation: employee.designation,
        joiningDate: employee.joiningDate,
        qualification: employee.qualification,
    };

    if (MEDICAL_DESIGNATIONS_SET.has(employee.designation)) {
        profile.medicalRegistrationNumber = employee.medicalRegistrationNumber;
    }

    if (SPECIALIZATION_DESIGNATIONS_SET.has(employee.designation)) {
        profile.specialization = employee.specialization;
    }

    if (employee.designation === "DOCTOR") {
        profile.consultationFee = employee.consultationFee;
        profile.availabilitySlots = employee.availabilitySlots;
    }

    return profile;
};

module.exports = buildEmployeeProfile;