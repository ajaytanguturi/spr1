const Patient = require("../models/Patients");
const Appointment = require("../models/Appointments");
const User = require("../models/Users");
const Employee = require("../models/Employees");

exports.getAdminDashboardStats = async (req, res) => {

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = await Appointment.find({
            appointmentDate: { $gte: today, $lt: tomorrow }
        }).populate('patientId', 'name').populate('doctorEmployeeId', 'name');

        const totalPatients = await Patient.countDocuments({ status: 'ACTIVE' });

        const pendingEmployees = await User.countDocuments({
            roles: 'STAFF',
            status: 'PENDING'
        });

        const completedToday = await Appointment.countDocuments({
            appointmentDate: { $gte: today, $lt: tomorrow },
            status: 'COMPLETED'
        });

        const bookedToday = await Appointment.countDocuments({
            appointmentDate: { $gte: today, $lt: tomorrow },
            status: 'BOOKED'
        });

        const totalEmployees = await User.countDocuments({ roles: 'STAFF' });

        res.status(200).json({
            message: "Admin dashboard statistics retrieved successfully",
            stats: {
                totalPatients,
                totalEmployees,
                pendingEmployees,
                todayAppointments: todayAppointments.length,
                completedToday,
                bookedToday,
                upcomingAppointments: todayAppointments
            }
        });
    } catch (err) {
        console.error("Error retrieving admin dashboard stats: ", err);
        res.status(500).json({
            message: "Server error while retrieving dashboard statistics"
        });
    }
}

exports.getDoctorDashboardStats = async (req, res) => {

    try {
        const doctorEmployeeCode = req.user.employeeCode;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = await Appointment.find({
            doctorEmployeeId: doctorEmployeeCode,
            appointmentDate: { $gte: today, $lt: tomorrow }
        }).populate('patientId', 'name UHID');

        const totalPatientsSeen = await Appointment.distinct('patientId', {
            doctorEmployeeId: doctorEmployeeCode,
            status: 'COMPLETED'
        });

        const completedToday = await Appointment.countDocuments({
            doctorEmployeeId: doctorEmployeeCode,
            appointmentDate: { $gte: today, $lt: tomorrow },
            status: 'COMPLETED'
        });
        const pendingAppointments = todayAppointments.filter(apt => apt.status === 'BOOKED').length;

        res.status(200).json({
            message: "Doctor dashboard statistics retrieved successfully",
            stats: {
                todayAppointments: todayAppointments.length,
                completedToday,
                pendingAppointments,
                totalPatientsSeen: totalPatientsSeen.length,
                upcomingAppointments: todayAppointments.filter(apt => apt.status === 'BOOKED')
            }
        });
    } catch (err) {
        console.error("Error retrieving doctor dashboard stats: ", err);
        res.status(500).json({
            message: "Server error while retrieving dashboard statistics"
        });
    }
}

exports.getReceptionistDashboardStats = async (req, res) => {

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = await Appointment.find({
            appointmentDate: { $gte: today, $lt: tomorrow }
        }).populate('patientId', 'name UHID').populate('doctorEmployeeId', 'name');

        const totalPatients = await Patient.countDocuments({ status: 'ACTIVE' });

        const newCheckIns = todayAppointments.filter(apt => apt.status === 'BOOKED').length;

        const completedToday = await Appointment.countDocuments({
            appointmentDate: { $gte: today, $lt: tomorrow },
            status: 'COMPLETED'
        });

        res.status(200).json({
            message: "Receptionist dashboard statistics retrieved successfully",
            stats: {
                totalPatients,
                todayAppointments: todayAppointments.length,
                newCheckIns,
                completedToday,
                upcomingAppointments: todayAppointments.filter(apt => apt.status === 'BOOKED')
            }
        });
    } catch (err) {
        console.error("Error retrieving receptionist dashboard stats: ", err);
        res.status(500).json({
            message: "Server error while retrieving dashboard statistics"
        });
    }
}

exports.getDashboardStats = async (req, res) => {

    try {
        const userRole = req.user.roles[0];

        if (userRole === 'OWNER' || userRole === 'ADMIN') {
            return this.getAdminDashboardStats(req, res);
        } else if (userRole === 'DOCTOR') {
            return this.getDoctorDashboardStats(req, res);
        } else if (userRole === 'RECEPTIONIST') {
            return this.getReceptionistDashboardStats(req, res);
        } else {
            return res.status(403).json({
                message: "Unauthorized to access dashboard statistics"
            });
        }
    } catch (err) {
        console.error("Error retrieving dashboard stats: ", err);
        res.status(500).json({
            message: "Server error while retrieving dashboard statistics"
        });
    }
}

exports.getAppointmentStats = async (req, res) => {

    try {
        const { startDate, endDate } = req.query;

        let filter = {};
        if (startDate && endDate) {
            filter.appointmentDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const total = await Appointment.countDocuments(filter);
        const completed = await Appointment.countDocuments({ ...filter, status: 'COMPLETED' });
        const booked = await Appointment.countDocuments({ ...filter, status: 'BOOKED' });
        const canceled = await Appointment.countDocuments({ ...filter, status: 'CANCELED' });

        res.status(200).json({
            message: "Appointment statistics retrieved successfully",
            stats: {
                total,
                completed,
                booked,
                canceled,
                completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%'
            }
        });
    } catch (err) {
        console.error("Error retrieving appointment stats: ", err);
        res.status(500).json({
            message: "Server error while retrieving appointment statistics"
        });
    }
}

exports.getPatientStats = async (req, res) => {

    try {
        const total = await Patient.countDocuments({ status: 'ACTIVE' });
        const inactive = await Patient.countDocuments({ status: 'INACTIVE' });
        const byGender = await Patient.aggregate([
            { $match: { status: 'ACTIVE' } },
            { $group: { _id: '$gender', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            message: "Patient statistics retrieved successfully",
            stats: {
                total,
                active: total,
                inactive,
                byGender
            }
        });
    } catch (err) {
        console.error("Error retrieving patient stats: ", err);
        res.status(500).json({
            message: "Server error while retrieving patient statistics"
        });
    }
}

exports.getEmployeeStats = async (req, res) => {

    try {
        const total = await User.countDocuments({ roles: 'STAFF' });
        const active = await User.countDocuments({ roles: 'STAFF', status: 'ACTIVE' });
        const pending = await User.countDocuments({ roles: 'STAFF', status: 'PENDING' });
        const inactive = await User.countDocuments({ roles: 'STAFF', status: 'INACTIVE' });

        const byDesignation = await Employee.aggregate([
            { $group: { _id: '$designation', count: { $sum: 1 } } }
        ]);

        const byDepartment = await Employee.aggregate([
            { $group: { _id: '$department', count: { $sum: 1 } } }
        ]);

        res.status(200).json({
            message: "Employee statistics retrieved successfully",
            stats: {
                total,
                active,
                pending,
                inactive,
                byDesignation,
                byDepartment
            }
        });
    } catch (err) {
        console.error("Error retrieving employee stats: ", err);
        res.status(500).json({
            message: "Server error while retrieving employee statistics"
        });
    }
}