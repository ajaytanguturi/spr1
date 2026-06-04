const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("node:crypto");
const User = require("../models/User");
const Employee = require("../models/Employee");
const { sendEmail } = require("../utils/emailService");
const { verificationEmailTemplate } = require("../utils/emailTemplate");

//Signup
exports.signup = async (req, res) => {
    try {
        const {
            email,
            password,
            name,
            phone,
            department,
            designation,
            status,
            joiningDate,
            medicalRegistrationNumber,
            specialization,
            qualification,
            consultationFee,
            availabilitySlots
        } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already registered" });
        }
        const password_hash = await bcrypt.hash(password, 12);

        const employee = new Employee();
        employee.email = email;
        employee.name = name;
        employee.phone = phone;
        employee.department = department;
        employee.designation = designation;
        employee.status = status;
        employee.joiningDate = joiningDate;
        employee.medicalRegistrationNumber = medicalRegistrationNumber;
        employee.specialization = specialization;
        employee.qualification = qualification;
        employee.consultationFee = consultationFee;
        employee.availabilitySlots = availabilitySlots;

        const savedEmployee = await employee.save();

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpiry = new Date(
            Date.now() + 24 * 60 * 60 * 1000,
        );

        await User.create({
            email,
            passwordHash: password_hash,
            role: designation,
            employeeId: savedEmployee.employeeId,
            verificationToken,
            verificationTokenExpiry,
            isActive: false
        });
        const verificationUrl = `${process.env.BASE_URL}/api/auth/verify-email/${verificationToken}`;

        await sendEmail({
            to: email,
            subject: "Verify Your HMS Account",
            htmlContent: verificationEmailTemplate(name, verificationUrl)
        });
        res.status(201).json({
            success: true,
            message: "Employee Created Successfully. Verification Email sent",
            data: savedEmployee
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

//Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const isMatch = Boolean(await bcrypt.compare(password, user.passwordHash));
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has not been verified. Please verify your email",
            });
        }
        user.last_login = new Date();
        await user.save();
        const token = jwt.sign(
            { id: user._id, role: user.role, email: user.email, employeeId: user.employeeId },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN },
        );
        const profile = await Employee.findOne({ employeeId: user.employeeId });
        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.employeeId,
                email: user.email,
                role: user.role,
                lastloginAt: user.last_login,
                profile,
            },
        });

    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
};

exports.me = async (req, res) => {
    try {
        const user = await User.findOne({ employeeId: req.user.employeeId }).select("-passwordHash -__v");
        console.log(user);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        const profile = await Employee.findOne({ employeeId: user.employeeId }).select("-__v");
        return res.status(200).json({
            user: {
                id: user.employeeId,
                email: user.email,
                role: user.role,
                lastLoginAt: user.lastLoginAt,
            },
            profile
        })
    }
    catch (err) {
        console.error("Me error:", err);
        res.status(500).json({ message: err.message });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpiry: {
                $gt: new Date()
            }
        });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired token"
            });
        }
        user.isActive = true;
        user.verificationToken = null;
        user.verificationTokenExpiry = null;
        await user.save();
        return res.status(200).json({
            success: true,
            message: "Email verified successfully"
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};