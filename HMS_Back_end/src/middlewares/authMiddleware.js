const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.NO_TOKEN);
    }

    const token = authHeader.split(" ")[1];

    try {
        req.user = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
    }
    catch {
        throw new AppError(STATUS.UNAUTHORIZED, MESSAGES.AUTH.INVALID_TOKEN);
    }

    next();
};

module.exports = authenticateUser;
