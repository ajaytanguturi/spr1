const User = require("../models/Users");
const Employee = require("../models/Employees");

async function deleteEmployeeAccount(employeeCode) {
  await Promise.all([
    Employee.deleteOne({ employeeCode }),
    User.deleteOne({ employeeCode }),
  ]);
}

module.exports = deleteEmployeeAccount;