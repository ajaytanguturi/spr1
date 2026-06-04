const apiInstance = require("../config/brevo");
const Brevo = require("sib-api-v3-sdk");

const sendEmail = async ({ to, subject, htmlContent,
}) => {
    try {
        await apiInstance.sendTransacEmail({
            sender: { name: process.env.EMAIL_FROM_NAME, email: process.env.EMAIL_FROM },
            to: [{ email: to }],
            subject,
            htmlContent
        });
        console.log(`Mail sent to ${to}`);
    } catch (error) {
        console.error("Email Error:", error);
        throw error;
    }
};

module.exports = { sendEmail };