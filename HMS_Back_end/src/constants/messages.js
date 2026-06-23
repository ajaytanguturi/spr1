const MESSAGES = Object.freeze({
    COMMON: Object.freeze({
        API_RUNNING: "API running",
        DB_STATUS_RETRIEVED: "Database status retrieved successfully",
        DB_CONNECTION_FAILED: "Database connection failed",
        DUPLICATE_KEY: "A record with the same unique value already exists",
        INTERNAL_ERROR: "Something went wrong. Please try again later.",
        INVALID_JSON: "Malformed JSON in request body",
        ROUTE_NOT_FOUND: "The requested resource was not found",
        VALIDATION_FAILED: "Validation failed"
    }),

    AUTH: Object.freeze({
        ACCESS_DENIED: "Access denied",
        ACCOUNT_INACTIVE: "Account is inactive",
        APPROVAL_PENDING: "Admin approval is pending",
        CURRENT_PASSWORD_INCORRECT: "Current password is incorrect", // NOSONAR not a credential
        EMPLOYEE_PROFILE_NOT_FOUND: "Employee profile not found",
        INVALID_CREDENTIALS: "Invalid email or password",
        INVALID_DESIGNATION: "Invalid designation. Cannot create admin or owner accounts.",
        INVALID_RESET_CODE: "Invalid or expired reset code",
        INVALID_TOKEN: "Invalid or expired token",
        LOGIN_SUCCESS: "Login successful",
        LOGOUT_SUCCESS: "User has been logged out successfully",
        NO_TOKEN: "No token provided",
        PASSWORDS_DO_NOT_MATCH: "Passwords do not match", // NOSONAR not a credential
        PASSWORD_CHANGED: "Password changed successfully", // NOSONAR not a credential
        PASSWORD_RESET_SUCCESS: "Password reset successful", // NOSONAR not a credential
        PASSWORD_SAME_AS_CURRENT: "New password cannot be the same as current password", // NOSONAR not a credential
        REGISTRATION_REJECTED: "Registration request is rejected",
        RESET_CODE_SENT: "If the email exists, a reset code has been sent",
        RESET_LINK_SENT: "If the email exists, a reset link has been sent",
        SELF_REGISTER_SUCCESS: "Registration request successful. Wait for admin approval.",
        UNAUTHORIZED: "Unauthorized access",
        USER_NOT_FOUND: "User not found",
        USER_RETRIEVED: "User retrieved successfully"
    }),

    EMPLOYEE: Object.freeze({
        CHANGE_REQUEST_SUBMITTED: "Your profile change request has been submitted for approval",
        DESIGNATION_INACTIVE: (designation) => `${designation} account is inactive`,
        DOCTORS_RETRIEVED: "Doctors retrieved successfully",
        DOESNT_EXIST: "Employee doesn't exist",
        EMAIL_EXISTS: "Employee with this email already exists",
        LIST_RETRIEVED: "Employees retrieved successfully",
        MED_REG_EXISTS: "Employee with this medical registration number already exists",
        NOT_DESIGNATION: (designation) => `The selected employee is not a ${designation}`,
        NOT_FOUND: "Employee not found",
        NO_VALID_CHANGES: "No valid changes were requested",
        PENDING_REQUEST_EXISTS: "You already have a pending profile change request awaiting approval",
        PROFILE_UPDATED: "Your profile has been updated successfully",
        RETRIEVED: "Employee retrieved successfully",
        USERNAME_EXISTS: "Username already exists",
        USER_DOESNT_EXIST: "User doesn't exist",
        USER_EMAIL_EXISTS: "User with this email already exists"
    }),

    ADMIN: Object.freeze({
        ACCOUNT_APPROVED: "Employee account approved successfully",
        AUDIT_LOGS_RETRIEVED: "Audit logs retrieved successfully",
        CANNOT_DELETE_PRIVILEGED: "Cannot delete OWNER or ADMIN accounts",
        CANNOT_UPDATE_PRIVILEGED: "Cannot update OWNER or ADMIN accounts",
        CHANGE_REQUESTS_RETRIEVED: "Profile change requests retrieved successfully",
        CHANGE_REQUEST_APPROVED: "Profile change request approved successfully",
        CHANGE_REQUEST_NOT_FOUND: "Profile change request not found",
        CHANGE_REQUEST_REJECTED: "Profile change request rejected successfully",
        CHANGE_REQUEST_REVIEWED: "This request has already been reviewed",
        EMPLOYEE_CREATED: "Employee account created successfully. Login credentials have been sent via email.",
        EMPLOYEE_DELETED: "Employee deleted successfully",
        EMPLOYEE_UPDATED: "Employee updated successfully",
        ONLY_STAFF_APPROVED: "Only STAFF accounts can be approved",
        ONLY_STAFF_REJECTED: "Only STAFF accounts can be rejected",
        REGISTRATION_REJECTED: "Employee registration request rejected successfully",
        STATUS_NOT_PENDING: "Account status is not pending"
    }),

    OWNER: Object.freeze({
        ADMINS_RETRIEVED: "Admins retrieved successfully",
        ADMIN_CREATED: "Admin account created successfully. Credentials sent via email.",
        ADMIN_DELETED: "Admin deleted successfully",
        ADMIN_NOT_FOUND: "Admin not found",
        ADMIN_UPDATED: "Admin updated successfully",
        CANNOT_DELETE_OWNER: "Owner account cannot be deleted"
    }),

    PATIENT: Object.freeze({
        ALREADY_REGISTERED: "Patient with this email is already registered",
        CREATED: "Patient account created successfully. Login credentials have been sent via email.",
        DOESNT_EXIST: "Patient doesn't exist",
        EMAIL_EXISTS: "Another patient with this email already exists",
        LIST_RETRIEVED: "Patients retrieved successfully",
        NOT_FOUND: "Patient not found",
        NO_SEARCH_QUERY: "No search query provided",
        PROFILE_RETRIEVED: "Profile retrieved successfully",
        PROFILE_UPDATED: "Profile updated successfully",
        REGISTER_SUCCESS: "Registration successful. You can now log in.",
        RETRIEVED: "Patient retrieved successfully",
        SEARCH_COMPLETED: "Search completed successfully",
        UPDATED: "Patient updated successfully"
    }),

    APPOINTMENT: Object.freeze({
        ALREADY_CANCELLED: "Appointment is already cancelled",
        ALREADY_COMPLETED: "Appointment is already completed",
        APPROVED: "Appointment approved successfully",
        BOOKED_SLOTS_RETRIEVED: "Booked slots retrieved successfully",
        CANCELLED: "Appointment cancelled successfully",
        CANCELLED_CANNOT_COMPLETE: "Cancelled appointments cannot be completed",
        CANNOT_COMPLETE_BEFORE_TIME: "This appointment cannot be completed before its scheduled date and time have passed",
        COMPLETED: "Appointment marked as completed",
        COMPLETED_CANNOT_CANCEL: "Completed appointments cannot be cancelled",
        CREATED: "Appointment created successfully",
        DOCTOR_AND_DATE_REQUIRED: "doctorEmployeeId and date are required",
        DOCTOR_NOT_JOINED: (joinedOn) => `Doctor has not joined yet. Earliest appointment date is ${joinedOn}`,
        DOCTOR_SLOT_CONFLICT: "Doctor already has an appointment for this time slot",
        DOCTOR_UNAVAILABLE_DAY: "Doctor is unavailable on the selected day",
        DOCTOR_UNAVAILABLE_SLOT: "Doctor is unavailable for the selected time slot",
        LIST_RETRIEVED: "Appointments retrieved successfully",
        NOT_FOUND: "Appointment not found",
        ONLY_BOOKED_EDITABLE: "Only BOOKED appointments can be edited",
        ONLY_PENDING_REVIEW_APPROVABLE: "Only apppointments peding review can be approved",
        ONLY_PENDING_REVIEW_REJECTABLE: "Only appointments pending review can be rejected",
        OWN_ONLY_CANCEL: "You can only cancel your own appointments",
        OWN_ONLY_COMPLETE: "You can only complete your own appointments",
        OWN_ONLY_MODIFY: "You can only modify your own appointments",
        PAST_DATE: "Cannot book an appointment in the past.",
        PAST_TIME: "Cannot book an appointment for a time that has already passed.",
        PATIENT_SAME_DAY_NOT_ALLOWED: "Appointments cannot be booked or rescheduled for today. Please choose a date starting tomorrow.",
        PATIENT_SLOT_CONFLICT: "Patient already has an appointment for this time slot",
        PENDING_REVIEW: "Your appointment request has been submitted and is pending review",
        PENDING_REVIEW_CANNOT_COMPLETE: "Appointments pending review must be approved before they can be completed",
        PENDING_REVIEW_LIST_RETRIEVED: "Pending review appointments retrieved successfully",
        REJECTED: "Appointment rejected successfully",
        REJECTED_CANNOT_CANCEL: "Rejected appointments cannot be cancelled",
        RETRIEVED: "Appointment retrieved successfully",
        TOO_FAR_AHEAD: "Appointments can only be booked up to 6 months in advance.",
        UPDATED: "Appointment updated successfully",
    }),

    NODE: Object.freeze({
        CREATED: "Node created successfully",
        DELETED: "Node deleted successfully",
        LIST_RETRIEVED: "Nodes retrieved successfully",
        NOT_FOUND: "Node not found",
        PATH_EXISTS: "Node path already exists",
        UPDATED: "Node updated successfully"
    }),

    DASHBOARD: Object.freeze({
        ADMIN_STATS_RETRIEVED: "Admin dashboard statistics retrieved successfully",
        APPOINTMENT_STATS_RETRIEVED: "Appointment statistics retrieved successfully",
        DOCTOR_STATS_RETRIEVED: "Doctor dashboard statistics retrieved successfully",
        EMPLOYEE_STATS_RETRIEVED: "Employee statistics retrieved successfully",
        PATIENT_STATS_RETRIEVED: "Patient statistics retrieved successfully",
        RECEPTIONIST_STATS_RETRIEVED: "Receptionist dashboard statistics retrieved successfully",
        UNAUTHORIZED: "Unauthorized to access dashboard statistics"
    }),

    MEDICAL_RECORD: Object.freeze({
        APPOINTMENT_PATIENT_MISMATCH: "The selected appointment does not belong to this patient",
        CREATED: "Medical record created successfully",
        DELETED: "Medical record deleted successfully",
        DOCTOR_REQUIRED: "Doctor employee id is required",
        LIST_RETRIEVED: "Medical records retrieved successfully",
        NOT_FOUND: "Medical record not found",
        RETRIEVED: "Medical record retrieved successfully",
        UPDATED: "Medical record updated successfully"
    }),

    AUDIT: Object.freeze({
        ADMIN_CREATED: (name, code) => `Admin account created for ${name} (${code})`,
        ADMIN_DELETED: (name, code) => `Admin ${name} (${code}) was deleted`,
        ADMIN_UPDATED: (name, code) => `Admin ${name} (${code}) was updated`,
        APPOINTMENT_APPROVED: (id) => `Appointment ${id} was approved`,
        APPOINTMENT_BOOKED: (id, patientName, doctorName) => `Appointment ${id} booked for ${patientName} with ${doctorName}`,
        APPOINTMENT_BOOKED_BY_PATIENT: (id, patientName, doctorName) => `Appointment ${id} booked by ${patientName} with ${doctorName}`,
        APPOINTMENT_CANCELLED: (id, reason) => `Appointment ${id} was cancelled. Reason: ${reason}`,
        APPOINTMENT_CANCELLED_BY_PATIENT: (id, reason) => `Appointment ${id} cancelled by patient. Reason: ${reason}`,
        APPOINTMENT_COMPLETED: (id) => `Appointment ${id} was marked completed`,
        APPOINTMENT_PENDING_REVIEW: (id, patientName, doctorName) => `Appointment ${id} requested by ${patientName} with ${doctorName}, pending review`,
        APPOINTMENT_REJECTED: (id, reason) => `Appointment ${id} was rejected. Reason: ${reason}`,
        APPOINTMENT_RESCHEDULED_BY_PATIENT: (id, patientName) => `Appointment ${id} rescheduled by ${patientName}`,
        APPOINTMENT_UPDATED: (id) => `Appointment ${id} was updated`,
        DOCTOR_DELETED_CANCELLATION: (id, doctorName, code, reason) =>
            `Appointment ${id} was cancelled due to deletion of doctor ${doctorName} (${code}). Reason: ${reason}`,
        EMPLOYEE_APPROVED: (code, username) => `Employee account ${code} (${username}) was approved`,
        EMPLOYEE_CREATED: (name, code, designation) => `Employee ${name} (${code}) was created as ${designation}`,
        EMPLOYEE_DELETED: (name, code) => `Employee ${name} (${code}) was deleted`,
        EMPLOYEE_PROFILE_UPDATED: (name, code) => `${name} (${code}) updated their profile`,
        EMPLOYEE_REGISTRATION_REJECTED: (code, username) => `Employee registration ${code} (${username}) was rejected`,
        EMPLOYEE_UPDATED: (name, code) => `Employee ${name} (${code}) was updated`,
        MEDICAL_RECORD_CREATED: (id, patientName, uhid) => `Medical record ${id} created for ${patientName} (${uhid})`,
        MEDICAL_RECORD_DELETED: (id) => `Medical record ${id} was deleted`,
        MEDICAL_RECORD_UPDATED: (id) => `Medical record ${id} was updated`,
        PATIENT_PROFILE_UPDATED: (name, uhid) => `Patient ${name} (${uhid}) updated their profile`,
        PATIENT_REGISTERED: (name, uhid) => `Patient ${name} (${uhid}) was registered`,
        PATIENT_UPDATED: (name, uhid) => `Patient ${name} (${uhid}) was updated`,
        PROFILE_CHANGE_APPROVED: (requestId, name, code) => `Profile change ${requestId} for ${name} (${code}) was approved`,
        PROFILE_CHANGE_REJECTED: (requestId, name, code) => `Profile change ${requestId} for ${name} (${code}) was rejected`,
        PROFILE_CHANGE_REQUESTED: (name, code) => `${name} (${code}) requested a profile change`
    })
});

module.exports = MESSAGES;
