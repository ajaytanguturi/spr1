class AppError extends Error {
    constructor(statusCode, message, errors = undefined) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.errors = errors;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;
