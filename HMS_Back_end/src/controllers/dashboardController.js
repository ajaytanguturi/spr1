const Patient = require("../models/Patients");
const Appointment = require("../models/Appointments");
const User = require("../models/Users");
const Employee = require("../models/Employees");
const AppError = require("../utils/AppError");
const { sendSuccess } = require("../utils/apiResponse");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

exports.getAdminDashboardStats = async (req, res) => {

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

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.ADMIN_STATS_RETRIEVED, {
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
};

exports.getDoctorDashboardStats = async (req, res) => {

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

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.DOCTOR_STATS_RETRIEVED, {
        stats: {
            todayAppointments: todayAppointments.length,
            completedToday,
            pendingAppointments,
            totalPatientsSeen: totalPatientsSeen.length,
            upcomingAppointments: todayAppointments.filter(apt => apt.status === 'BOOKED')
        }
    });
};

exports.getReceptionistDashboardStats = async (req, res) => {

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

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.RECEPTIONIST_STATS_RETRIEVED, {
        stats: {
            totalPatients,
            todayAppointments: todayAppointments.length,
            newCheckIns,
            completedToday,
            upcomingAppointments: todayAppointments.filter(apt => apt.status === 'BOOKED')
        }
    });
};

exports.getDashboardStats = async (req, res) => {

    const userRole = req.user.roles[0];

    if (userRole === 'OWNER' || userRole === 'ADMIN') {
        return this.getAdminDashboardStats(req, res);
    } else if (userRole === 'DOCTOR') {
        return this.getDoctorDashboardStats(req, res);
    } else if (userRole === 'RECEPTIONIST') {
        return this.getReceptionistDashboardStats(req, res);
    } else {
        throw new AppError(STATUS.FORBIDDEN, MESSAGES.DASHBOARD.UNAUTHORIZED);
    }
};

exports.getAppointmentStats = async (req, res) => {

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

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.APPOINTMENT_STATS_RETRIEVED, {
        stats: {
            total,
            completed,
            booked,
            canceled,
            completionRate: total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0%'
        }
    });
};

exports.getPatientStats = async (req, res) => {

    const total = await Patient.countDocuments({ status: 'ACTIVE' });
    const inactive = await Patient.countDocuments({ status: 'INACTIVE' });
    const byGender = await Patient.aggregate([
        { $match: { status: 'ACTIVE' } },
        { $group: { _id: '$gender', count: { $sum: 1 } } }
    ]);

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.PATIENT_STATS_RETRIEVED, {
        stats: {
            total,
            active: total,
            inactive,
            byGender
        }
    });
};

exports.getEmployeeStats = async (req, res) => {

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

    return sendSuccess(res, STATUS.OK, MESSAGES.DASHBOARD.EMPLOYEE_STATS_RETRIEVED, {
        stats: {
            total,
            active,
            pending,
            inactive,
            byDesignation,
            byDepartment
        }
    });
};
