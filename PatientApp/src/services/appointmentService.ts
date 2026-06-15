import { apiFetch } from "./apiClient";
import type { Appointment, AppointmentStatus, Doctor } from "./types";

type AppointmentsData = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  appointments: Appointment[];
};

type DoctorsData = { total: number; doctors: Doctor[] };
type BookedSlotsData = { bookedSlots: string[] };
type AppointmentData = { appointment: Appointment };

export function getMyAppointments(status?: AppointmentStatus) {
  const query = status ? `?status=${status}&limit=100` : "?limit=100";
  return apiFetch<AppointmentsData>(`/patient/appointments${query}`);
}

export function getDoctors() {
  return apiFetch<DoctorsData>("/patient/doctors");
}

export function getBookedSlots(doctorEmployeeId: string, date: string) {
  return apiFetch<BookedSlotsData>(
    `/patient/booked-slots?doctorEmployeeId=${encodeURIComponent(
      doctorEmployeeId,
    )}&date=${encodeURIComponent(date)}`,
  );
}

export function bookAppointment(
  doctorEmployeeId: string,
  appointmentDate: string,
  timeSlot: string,
) {
  return apiFetch<AppointmentData>("/patient/appointments", {
    method: "POST",
    body: { doctorEmployeeId, appointmentDate, timeSlot },
  });
}

export function updateAppointment(
  appointmentId: string,
  doctorEmployeeId: string,
  appointmentDate: string,
  timeSlot: string,
) {
  return apiFetch<AppointmentData>(`/patient/appointments/${appointmentId}`, {
    method: "PUT",
    body: { doctorEmployeeId, appointmentDate, timeSlot },
  });
}

export function cancelAppointment(
  appointmentId: string,
  cancellationReason: string,
) {
  return apiFetch<AppointmentData>(
    `/patient/appointments/${appointmentId}/cancel`,
    {
      method: "PUT",
      body: { cancellationReason },
    },
  );
}
