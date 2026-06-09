require("dotenv").config();
const mongoose = require("mongoose");

const Counter = require("../models/Counter");
const Employee = require("../models/Employees");
const User = require("../models/Users");

const OWNER_EMPLOYEE = {
  employeeCode: "EMP-000001",
  name: "Hospital Owner",
  phone: "+91 9876543210",
  email: "owner@hospital.com",
  department: "Administration",
  designation: "OWNER",
  joiningDate: new Date(),
  qualification: ["MBA Hospital Administration"],
};

const OWNER_USER = {
  username: "owner",
  email: "owner@hospital.com",
  passwordHash: process.env.OWNER_PASS,
  status: "ACTIVE",
  roles: ["OWNER"],
  employeeCode: "EMP-000001",
  mustChangePassword: false,
  createdByAdmin: false,
  approvedBy: null,
  approvedAt: null,
  createdBy: null,
  resetPasswordTokenHash: null,
  resetPasswordTokenExpiry: null,
  lastLoginAt: null,
};

const seedOwner = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected for seeding");

    const counterExists = await Counter.findOne({ name: "employees" });

    if (counterExists) {
      console.log("Skipped counter");
    } else {
      await Counter.create({
        name: "employees",
        seq: 1,
      });
      console.log("Created counter");
    }

    const employeeExists = await Employee.findOne({
      employeeCode: OWNER_EMPLOYEE.employeeCode,
    });

    if (employeeExists) {
      console.log("Skipped owner employee");
    } else {
      await Employee.create(OWNER_EMPLOYEE);
      console.log("Created owner employee");
    }

    const userExists = await User.findOne({
      username: OWNER_USER.username,
    });

    if (userExists) {
      console.log("Skipped owner user");
    } else {
      await User.create(OWNER_USER);
      console.log("Created owner user");
    }

    console.log("Seeding complete");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
};

seedOwner();