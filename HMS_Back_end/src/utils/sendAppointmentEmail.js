const sendEmail = require("./sendEmail");

const sendAppointmentEmail = async (to, template) => {
    try {
        await sendEmail({ to, ...template });
    } catch (emailError) {
        console.error("Email sending error:", emailError);
    }
};

module.exports = sendAppointmentEmail;
