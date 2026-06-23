const frontendUrl = () => {
  let url = process.env.FRONTEND_URL || "http://localhost:4200";
  while (url.endsWith("/")) url = url.slice(0, -1);
  return url;
};

const loginUrl = () => `${frontendUrl()}/login`;

const wrap = (innerHtml) => `
  ${innerHtml}
  <p>
    Regards,
    <br />
    HMS Team
  </p>
`;

const loginButton = (label = "Login to HMS") => `
  <p>
    <a href="${loginUrl()}">${label}</a>
  </p>
`;

const formatDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return String(value);
  }
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const employeeCredentials = ({ username, temporaryPassword }) => ({
  subject: "HMS Employee Account Created",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your employee account has been created successfully.</p>
    <p><strong>Username:</strong> ${username}</p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
    <p>Please login using the link below and change your password immediately.</p>
    ${loginButton()}
  `),
});

const adminCredentials = ({ username, temporaryPassword }) => ({
  subject: "HMS Admin Account Created",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your admin account has been created successfully.</p>
    <p><strong>Username:</strong> ${username}</p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
    <p>Please login using the link below and change your password immediately.</p>
    ${loginButton()}
  `),
});

const patientCredentials = ({ email, temporaryPassword }) => ({
  subject: "HMS Patient Account Created",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your patient account has been created successfully.</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
    <p>Please login using the link below and change your password immediately.</p>
    ${loginButton("Patient Login")}
  `),
});

const accountApproved = () => ({
  subject: "HMS Employee Account Approved",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your employee account has been approved. You can login to HMS.</p>
    ${loginButton()}
  `),
});

const accountRejected = () => ({
  subject: "HMS Employee Account Registration Rejected",
  html: wrap(`
    <h2>HMS Registration Request Rejected</h2>
    <p>
      Your registration has been rejected.
      Please contact the administrator/support team for more details.
    </p>
  `),
});

const registrationRequest = ({ name, employeeCode, department, designation }) => ({
  subject: "New Employee Registration Request",
  html: wrap(`
    <h2>New Employee Registration Request</h2>
    <p>A new employee has submitted a registration request and is awaiting approval.</p>
    <p><strong>Name:</strong> ${name}</p>
    <p><strong>Employee Code:</strong> ${employeeCode}</p>
    <p><strong>Department:</strong> ${department}</p>
    <p><strong>Designation:</strong> ${designation}</p>
    <p>Please review the request from the admin dashboard.</p>
    ${loginButton("Open Admin Dashboard")}
  `),
});

const profileChangeRequest = ({ name, employeeCode }) => ({
  subject: "Employee Profile Change Request",
  html: wrap(`
    <h2>Profile Change Request</h2>
    <p>
      ${name} (${employeeCode}) has requested changes to their profile and is
      awaiting approval.
    </p>
    <p>Please review the request from the admin dashboard.</p>
    ${loginButton("Open Admin Dashboard")}
  `),
});

const profileChangeApproved = () => ({
  subject: "Profile Change Request Approved",
  html: wrap(`
    <h2>Profile Change Approved</h2>
    <p>Your requested profile changes have been approved and applied.</p>
  `),
});

const profileChangeRejected = () => ({
  subject: "Profile Change Request Rejected",
  html: wrap(`
    <h2>Profile Change Rejected</h2>
    <p>
      Your requested profile changes have been rejected.
      Please contact the administrator for more details.
    </p>
  `),
});

const appointmentScheduled = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
}) => ({
  subject: "Appointment Scheduled",
  html: wrap(`
    <h2>Welcome to HMS</h2>
    <p>Your appointment has been created successfully.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
  `),
});

const appointmentPendingReview = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
}) => ({
  subject: "Appointment Request Received",
  html: wrap(`
    <h2>Appointment Request Received</h2>
    <p>Thank you. Your appointment request has been received and is awaiting review by our staff.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Requested Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
    <p>You'll receive another email once your appointment has been reviewed.</p>
  `),
});

const appointmentApproved = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
}) => ({
  subject: "Appointment Approved",
  html: wrap(`
    <h2>Appointment Approved</h2>
    <p>Good news! Your appointment request has been reviewed and approved.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
  `),
});

const appointmentRejected = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
  rejectionReason,
}) => ({
  subject: "Appointment Request Declined",
  html: wrap(`
    <h2>Appointment Request Declined</h2>
    <p>We're sorry, your appointment request could not be approved.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Requested Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
    ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ""}
    <p>Please contact us or submit a new request for a different slot.</p>
  `),
});

const appointmentUpdated = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
}) => ({
  subject: "Appointment Updated",
  html: wrap(`
    <h2>Appointment Updated</h2>
    <p>Your appointment details have been updated.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
  `),
});

const appointmentCanceled = ({
  patientName,
  doctorName,
  appointmentDate,
  timeSlot,
  cancellationReason,
}) => ({
  subject: "Appointment Cancelled",
  html: wrap(`
    <h2>Appointment Cancelled</h2>
    <p>Your appointment has been cancelled.</p>
    <p><strong>Patient Name:</strong> ${patientName}</p>
    <p><strong>Doctor Name:</strong> ${doctorName}</p>
    <p><strong>Appointment Date:</strong> ${formatDate(appointmentDate)}</p>
    <p><strong>Time Slot:</strong> ${timeSlot}</p>
    ${cancellationReason ? `<p><strong>Reason:</strong> ${cancellationReason}</p>` : ""}
    <p>If you believe this was a mistake, please contact us or visit the hospital.</p>
  `),
});

const passwordReset = ({ resetToken }) => ({
  subject: "HMS Password Reset Request",
  html: wrap(`
    <h2>HMS Password Reset</h2>
    <p>Use the link below to reset your password.</p>
    <p>
      <a href="${frontendUrl()}/reset-password?token=${resetToken}">
        Reset Password
      </a>
    </p>
    <p>This reset link expires in 15 minutes.</p>
    <p>If you did not request this, ignore this email.</p>
  `),
});

const patientPasswordResetCode = ({ resetCode }) => ({
  subject: "HMS Password Reset Code",
  html: wrap(`
    <h2>HMS Password Reset</h2>
    <p>Use the code below in the HMS patient app to reset your password.</p>
    <p style="font-size: 24px; letter-spacing: 4px;"><strong>${resetCode}</strong></p>
    <p>This code expires in 15 minutes.</p>
    <p>If you did not request this, ignore this email.</p>
  `),
});

module.exports = {
  frontendUrl,
  loginUrl,
  employeeCredentials,
  adminCredentials,
  patientCredentials,
  accountApproved,
  accountRejected,
  registrationRequest,
  profileChangeRequest,
  profileChangeApproved,
  profileChangeRejected,
  appointmentScheduled,
  appointmentPendingReview,
  appointmentRejected,
  appointmentUpdated,
  appointmentCanceled,
  passwordReset,
  patientPasswordResetCode,
};