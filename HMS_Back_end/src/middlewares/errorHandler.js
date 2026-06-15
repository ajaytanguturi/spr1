const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const sendError = (res, statusCode, message, errors) => {
    const body = {
        success: false,
        statusCode,
        message
    };
    if (errors?.length) {
        body.errors = errors;
    }
    return res.status(statusCode).json(body);
};
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    if (err instanceof AppError) {
        return sendError(res, err.statusCode, err.message, err.errors);
    }
    if (err.type === "entity.parse.failed") {
        return sendError(res, STATUS.BAD_REQUEST, MESSAGES.COMMON.INVALID_JSON);
    }
    if (err.name === "ValidationError") {
        const errors = Object.values(err.errors || {}).map((e) => ({
            msg: e.message,
            path: e.path
        }));
        return sendError(res, STATUS.UNPROCESSABLE_ENTITY, MESSAGES.COMMON.VALIDATION_FAILED, errors);
    }

    if (err.name === "CastError") {
        return sendError(res, STATUS.BAD_REQUEST, MESSAGES.COMMON.VALIDATION_FAILED);
    }
    if (err.code === 11000) {
        return sendError(res, STATUS.CONFLICT, MESSAGES.COMMON.DUPLICATE_KEY);
    }

    console.error("Unhandled error:", err);
    return sendError(res, STATUS.INTERNAL_SERVER_ERROR, MESSAGES.COMMON.INTERNAL_ERROR);
};

module.exports = errorHandler;
module.exports.sendError = sendError;
