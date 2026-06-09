const Employee = require("../models/Employees");
const Patient = require("../models/Patients");
const sendEmail = require("../utils/sendEmail");
const Appointment = require("../models/Appointments");
const checkAppointmentValidity = require("../validators/checkAppointmentValidity");
const recordAudit = require("../utils/recordAudit");
const resolveActor = require("../utils/resolveActor");
const emailTemplates = require("../utils/emailTemplates");
const parsePagination = require("../utils/parsePagination");
const enrichAppointments = require("../utils/enrichAppointments");

const ACTIVE_STATUSES = ["BOOKED", "COMPLETED"];

const paginateAppointments = async (filter, reqQuery, res) => {
    const { page, limit, skip } = parsePagination(reqQuery);

    if (reqQuery.date) {
        const start = new Date(reqQuery.date);
        const end = new Date(reqQuery.date);
        end.setHours(23, 59, 59, 999);
        filter.appointmentDate = { $gte: start, $lte: end };
    }
    const [appointments, total] = await Promise.all([
        Appointment.find(filter)
            .select("-__v")
            .sort({ appointmentDate: -1, _id: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Appointment.countDocuments(filter)
    ]);
    const enriched = await enrichAppointments(appointments);
    return res.status(200).json({
        message: "Appointments retrieved successfully",
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        appointments: enriched
    });
};

exports.createAppointment = async (req, res) => {
    try {
        const {
            patientId,
            doctorEmployeeId,
            appointmentDate,
            timeSlot
        } = req.body;

        const validAppointment = await checkAppointmentValidity({
            patientId,
            doctorId: doctorEmployeeId,
            appointmentDate,
            timeSlot
        });

        if (!validAppointment.success) {
            return res.status(validAppointment.status).json({
                message: validAppointment.message
            });
        }

        const appointment = await Appointment.create({
            patientId,
            doctorEmployeeId,
            appointmentDate,
            timeSlot,
            createdByEmployeeId: req.user.employeeCode
        });

        try {
            await sendEmail({
                to: validAppointment.patient.email,
                ...emailTemplates.appointmentScheduled({
                    patientName: validAppointment.patient.name,
                    doctorName: validAppointment.doctor.name,
                    appointmentDate,
                    timeSlot
                })
            });
        } catch (emailError) {
            console.error("Email sending error:", emailError);
        }

        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "APPOINTMENT_CREATED",
            targetType: "APPOINTMENT",
            targetId: appointment.appointmentId,
            message: `Appointment ${appointment.appointmentId} booked for ${validAppointment.patient.name} with ${validAppointment.doctor.name}`
        });

        return res.status(201).json({
            message: "Appointment created successfully",
            appointment
        });

    }
    catch (err) {
        console.error("Error during appointment creation: ", err);
        return res.status(500).json({
            message: "Server error during appointment creation"
        });
    }
};

exports.getAppointments = async (req, res) => {
    try {
        const filter = {};

        if (req.query.status) {
            filter.status = req.query.status;
        }

        if (req.query.doctorEmployeeId) {
            filter.doctorEmployeeId = req.query.doctorEmployeeId;
        }

        if (req.query.patientId) {
            filter.patientId = req.query.patientId;
        }

        await paginateAppointments(filter, req.query, res);
    }
    catch (err) {
        console.error("Error during appointments retrieval: ", err);
        return res.status(500).json({
            message: "Server error while fetching appointments"
        });
    }
};

exports.getMyAppointments = async (req, res) => {
    try {
        const filter = { doctorEmployeeId: req.user.employeeCode };

        if (req.query.status) {
            filter.status = req.query.status;
        }

        await paginateAppointments(filter, req.query, res);
    }
    catch (err) {
        console.error("Error during doctor appointments retrieval: ", err);
        return res.status(500).json({
            message: "Server error while fetching appointments"
        });
    }
};

exports.getAppointmentById = async (req, res) => {

    try {
        const { appointmentId } = req.params;
        const appointment = await Appointment.findOne({
            appointmentId
        })
            .select("-__v")
            .lean();

        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }
        const [enriched] = await enrichAppointments([appointment]);
        return res.status(200).json({
            message: "Appointment retrieved successfully",
            appointment: enriched
        });
    }
    catch (err) {
        console.error("Error during appointment retrieval: ", err);
        return res.status(500).json({
            message: "Server error while fetching appointment"
        });
    }
};

exports.getBookedSlots = async (req, res) => {

    try {
        const { doctorEmployeeId, date } = req.query;

        if (!doctorEmployeeId || !date) {
            return res.status(400).json({
                message: "doctorEmployeeId and date are required"
            });
        }

        const start = new Date(date);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        const bookedSlotsFilter = {
            doctorEmployeeId,
            appointmentDate: { $gte: start, $lte: end },
            status: "BOOKED"
        };

        const { excludeAppointmentId } = req.query;
        if (excludeAppointmentId) {
            bookedSlotsFilter.appointmentId = { $ne: excludeAppointmentId };
        }

        const appointments = await Appointment.find(bookedSlotsFilter).select("timeSlot -_id");

        const bookedSlots = appointments.map((a) => a.timeSlot);

        return res.status(200).json({
            message: "Booked slots retrieved successfully",
            doctorEmployeeId,
            date,
            bookedSlots
        });
    }
    catch (err) {
        console.error("Error fetching booked slots: ", err);
        return res.status(500).json({
            message: "Server error while fetching booked slots"
        });
    }
};

exports.cancelAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { cancellationReason } = req.body;
        const appointment = await Appointment.findOne({ appointmentId });
        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        if (appointment.status === "CANCELED") {
            return res.status(400).json({
                message: "Appointment is already cancelled"
            });
        }

        if (appointment.status === "COMPLETED") {
            return res.status(400).json({
                message: "Completed appointments cannot be cancelled"
            });
        }

        appointment.status = "CANCELED";
        appointment.cancellationReason = cancellationReason;
        await appointment.save();

        try {
            const [patient, doctor] = await Promise.all([
                Patient.findOne({ UHID: appointment.patientId }).select("name email"),
                Employee.findOne({ employeeCode: appointment.doctorEmployeeId }).select("name")
            ]);
            if (patient?.email) {
                await sendEmail({
                    to: patient.email,
                    ...emailTemplates.appointmentCanceled({
                        patientName: patient.name,
                        doctorName: doctor?.name,
                        appointmentDate: appointment.appointmentDate,
                        timeSlot: appointment.timeSlot,
                        cancellationReason
                    })
                });
            }
        } catch (emailError) {
            console.error("Email sending error:", emailError);
        }

        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "APPOINTMENT_CANCELED",
            targetType: "APPOINTMENT",
            targetId: appointment.appointmentId,
            message: `Appointment ${appointment.appointmentId} was cancelled. Reason: ${cancellationReason}`
        });

        return res.status(200).json({
            message: "Appointment cancelled successfully",
            appointment
        });
    }
    catch (err) {
        console.error("Error during appointment cancellation: ", err);
        return res.status(500).json({
            message: "Server error during appointment cancellation"
        });
    }
};

exports.updateAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const {
            patientId,
            doctorEmployeeId,
            appointmentDate,
            timeSlot
        } = req.body;
        const appointment = await Appointment.findOne({ appointmentId });
        if (!appointment) {
            return res.status(404).json({ message: "Appointment not found" });
        }
        if (appointment.status !== "BOOKED") {
            return res.status(400).json({
                message: "Only BOOKED appointments can be edited"
            });
        }
        const validAppointment = await checkAppointmentValidity({
            patientId,
            doctorId: doctorEmployeeId,
            appointmentDate,
            timeSlot,
            excludeAppointmentId: appointmentId
        });

        if (!validAppointment.success) {
            return res.status(validAppointment.status).json({
                message: validAppointment.message
            });
        }

        appointment.patientId = patientId;
        appointment.doctorEmployeeId = doctorEmployeeId;
        appointment.appointmentDate = appointmentDate;
        appointment.timeSlot = timeSlot;
        await appointment.save();

        try {
            await sendEmail({
                to: validAppointment.patient.email,
                ...emailTemplates.appointmentUpdated({
                    patientName: validAppointment.patient.name,
                    doctorName: validAppointment.doctor.name,
                    appointmentDate,
                    timeSlot
                })
            });
        } catch (emailError) {
            console.error("Email sending error:", emailError);
        }

        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "APPOINTMENT_UPDATED",
            targetType: "APPOINTMENT",
            targetId: appointment.appointmentId,
            message: `Appointment ${appointment.appointmentId} was updated`
        });

        return res.status(200).json({
            message: "Appointment updated successfully",
            appointment
        });
    }
    catch (err) {
        console.error("Error during appointment update: ", err);
        return res.status(500).json({
            message: "Server error during appointment update"
        });
    }
};

exports.completeAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const appointment = await Appointment.findOne({ appointmentId });
        if (!appointment) {
            return res.status(404).json({
                message: "Appointment not found"
            });
        }

        if (appointment.doctorEmployeeId !== req.user.employeeCode) {
            return res.status(403).json({
                message: "You can only complete your own appointments"
            });
        }
        if (appointment.status === "CANCELED") {
            return res.status(400).json({
                message: "Cancelled appointments cannot be completed"
            });
        }

        if (appointment.status === "COMPLETED") {
            return res.status(400).json({
                message: "Appointment is already completed"
            });
        }
        const slotStart = (appointment.timeSlot || "").split("-")[0];
        const [slotHour, slotMinute] = slotStart.split(":").map(Number);
        const scheduledStart = new Date(appointment.appointmentDate);
        if (!Number.isNaN(slotHour) && !Number.isNaN(slotMinute)) {
            scheduledStart.setHours(slotHour, slotMinute, 0, 0);
        }
        if (scheduledStart.getTime() > Date.now()) {
            return res.status(400).json({
                message:
                    "This appointment cannot be completed before its scheduled date and time have passed"
            });
        }

        appointment.status = "COMPLETED";
        await appointment.save();

        const actor = await resolveActor(req.user);
        await recordAudit({
            actor,
            action: "APPOINTMENT_COMPLETED",
            targetType: "APPOINTMENT",
            targetId: appointment.appointmentId,
            message: `Appointment ${appointment.appointmentId} was marked completed`
        });

        return res.status(200).json({
            message: "Appointment marked as completed",
            appointment
        });
    }
    catch (err) {
        console.error("Error during appointment completion: ", err);
        return res.status(500).json({
            message: "Server error during appointment completion"
        });
    }
};