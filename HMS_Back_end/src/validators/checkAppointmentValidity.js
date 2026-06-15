const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const validateEmployeeStatus = require("./validateEmployeeStatus");
const AppError = require("../utils/AppError");
const STATUS = require("../constants/statusCodes");
const MESSAGES = require("../constants/messages");

const withExclusion = (filter, excludeAppointmentId) => {
  if (!excludeAppointmentId) return filter;
  return { ...filter, appointmentId: { $ne: excludeAppointmentId } };
};

const checkAppointmentValidity = async ({
  patientId,
  doctorId,
  appointmentDate,
  timeSlot,
  excludeAppointmentId,
}) => {

  const patient = await Patient.findOne({
    UHID: patientId,
  });

  if (!patient) {
    throw new AppError(STATUS.NOT_FOUND, MESSAGES.PATIENT.DOESNT_EXIST);
  }

  const doctor = await validateEmployeeStatus(doctorId, "DOCTOR");

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const apptDay = new Date(appointmentDate);
  apptDay.setHours(0, 0, 0, 0);

  if (apptDay.getTime() < todayStart.getTime()) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.PAST_DATE);
  }
  const maxBookingDay = new Date(todayStart);
  maxBookingDay.setMonth(maxBookingDay.getMonth() + 6);

  if (apptDay.getTime() > maxBookingDay.getTime()) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.TOO_FAR_AHEAD);
  }

  if (apptDay.getTime() === todayStart.getTime()) {
    const [slotStartHH, slotStartMM] = timeSlot
      .split("-")[0]
      .split(":")
      .map(Number);
    const slotStartMinutes = slotStartHH * 60 + slotStartMM;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    if (slotStartMinutes <= nowMinutes) {
      throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.PAST_TIME);
    }
  }

  if (doctor.joiningDate) {
    const apptDay = new Date(appointmentDate);
    apptDay.setHours(0, 0, 0, 0);

    const joinDay = new Date(doctor.joiningDate);
    joinDay.setHours(0, 0, 0, 0);

    if (apptDay.getTime() < joinDay.getTime()) {
      const joinedOn = joinDay.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      throw new AppError(
        STATUS.CONFLICT,
        MESSAGES.APPOINTMENT.DOCTOR_NOT_JOINED(joinedOn)
      );
    }
  }
  const appointmentDay = new Date(appointmentDate)
    .toLocaleDateString("en-US", {
      weekday: "long",
    })
    .toUpperCase();

  const matchingSlot = (doctor.availabilitySlots || []).find(
    (slot) => slot.day === appointmentDay,
  );

  if (!matchingSlot) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.DOCTOR_UNAVAILABLE_DAY);
  }

  const [appointmentStartTime, appointmentEndTime] = timeSlot.split("-");
  const isValidTimeSlot =
    appointmentStartTime >= matchingSlot.startTime &&
    appointmentEndTime <= matchingSlot.endTime;

  if (!isValidTimeSlot) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.DOCTOR_UNAVAILABLE_SLOT);
  }

  const patientAppointment = await Appointment.findOne(
    withExclusion(
      { patientId, appointmentDate, timeSlot, status: { $ne: "CANCELED" } },
      excludeAppointmentId,
    ),
  );

  if (patientAppointment) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.PATIENT_SLOT_CONFLICT);
  }

  const doctorAppointment = await Appointment.findOne(
    withExclusion(
      { doctorEmployeeId: doctorId, appointmentDate, timeSlot, status: { $ne: "CANCELED" } },
      excludeAppointmentId,
    ),
  );

  if (doctorAppointment) {
    throw new AppError(STATUS.CONFLICT, MESSAGES.APPOINTMENT.DOCTOR_SLOT_CONFLICT);
  }

  return {
    patient,
    doctor,
  };
};

module.exports = checkAppointmentValidity;
