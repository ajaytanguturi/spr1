const Appointment = require("../models/Appointments");
const Patient = require("../models/Patients");
const validateEmployeeStatus = require("./validateEmployeeStatus");

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
    return {
      success: false,
      status: 404,
      message: "Patient doesn't exist",
    };
  }

  const validDoctor = await validateEmployeeStatus(doctorId, "DOCTOR");

  if (!validDoctor.success) {
    return validDoctor;
  }

  const doctor = validDoctor.employee;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const apptDay = new Date(appointmentDate);
  apptDay.setHours(0, 0, 0, 0);

  if (apptDay.getTime() < todayStart.getTime()) {
    return {
      success: false,
      status: 409,
      message: "Cannot book an appointment in the past.",
    };
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
      return {
        success: false,
        status: 409,
        message: "Cannot book an appointment for a time that has already passed.",
      };
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
      return {
        success: false,
        status: 409,
        message: `Doctor has not joined yet. Earliest appointment date is ${joinedOn}`,
      };
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
    return {
      success: false,
      status: 409,
      message: "Doctor is unavailable on the selected day",
    };
  }

  const [appointmentStartTime, appointmentEndTime] = timeSlot.split("-");

  const isValidTimeSlot =
    appointmentStartTime >= matchingSlot.startTime &&
    appointmentEndTime <= matchingSlot.endTime;

  if (!isValidTimeSlot) {
    return {
      success: false,
      status: 409,
      message: "Doctor is unavailable for the selected time slot",
    };
  }

  const patientAppointment = await Appointment.findOne(
    withExclusion(
      { patientId, appointmentDate, timeSlot, status: { $ne: "CANCELED" } },
      excludeAppointmentId,
    ),
  );

  if (patientAppointment) {
    return {
      success: false,
      status: 409,
      message: "Patient already has an appointment for this time slot",
    };
  }

  const doctorAppointment = await Appointment.findOne(
    withExclusion(
      { doctorEmployeeId: doctorId, appointmentDate, timeSlot, status: { $ne: "CANCELED" } },
      excludeAppointmentId,
    ),
  );

  if (doctorAppointment) {
    return {
      success: false,
      status: 409,
      message: "Doctor already has an appointment for this time slot",
    };
  }

  return {
    success: true,
    patient,
    doctor,
  };
};

module.exports = checkAppointmentValidity;