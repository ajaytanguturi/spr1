const buildEmployeeProfile = require("./buildEmployeeProfile");

const buildEmployeeResponse = (employees, users) => {

    const userMap = new Map();
    users.forEach((user) => {
        userMap.set(
            String(user.employeeCode),
            user
        );
    });

    return employees.map((employee) => {
        const matchedUser =
            userMap.get(
                String(employee.employeeCode)
            );

        const profile = buildEmployeeProfile(employee);
        return {
            employee: profile,
            status: matchedUser?.status,
            roles: matchedUser?.roles,
            lastLoginAt: matchedUser?.lastLoginAt
        };
    });
};

module.exports = buildEmployeeResponse;