const authorizeRoles = (...allowedRoles) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized access"
            });
        }

        const hasPermission =
            req.user.roles.some((role) =>
                allowedRoles.includes(role)
            );

        if (!hasPermission) {
            return res.status(403).json({
                message: "Access denied"
            });
        }

        next();
    };
};

module.exports = authorizeRoles;