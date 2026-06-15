const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const notFound = (req, res, next) =>
    next(new AppError(STATUS.NOT_FOUND, MESSAGES.COMMON.ROUTE_NOT_FOUND));

module.exports = notFound;
