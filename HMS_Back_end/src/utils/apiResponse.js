const sendSuccess = (res, statusCode, message, data = {}) =>
    res.status(statusCode).json({
        success: true,
        statusCode,
        message,
        data
    });

module.exports = { sendSuccess };
