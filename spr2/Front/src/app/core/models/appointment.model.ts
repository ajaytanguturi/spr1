import { AvailabilitySlot } from './employee.model';
export type AppointmentStatus = 'BOOKED' | 'CANCELED' | 'COMPLETED';

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'BOOKED',
  'CANCELED',
  'COMPLETED',
];

export interface AppointmentPatientRef {
  UHID: string;
  name: string;
  phone: string;
  email: string;
}

export interface AppointmentDoctorRef {
  employeeCode: string;
  name: string;
  specialization?: string;
  department?: string;
  consultationFee?: number;
}

export interface Appointment {
  appointmentId: string;
  patientId: string;
  doctorEmployeeId: string;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  createdByEmployeeId?: string;
  patient?: AppointmentPatientRef | null;
  doctor?: AppointmentDoctorRef | null;
}

export interface DoctorOption {
  employeeCode: string;
  name: string;
  specialization?: string;
  department?: string;
  consultationFee?: number;
  availabilitySlots?: AvailabilitySlot[];
  qualification?: string[];
  joiningDate?: string;
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorEmployeeId: string;
  appointmentDate: string;
  timeSlot: string;
}

export type UpdateAppointmentPayload = CreateAppointmentPayload;

export interface AppointmentsResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  appointments: Appointment[];
}

export interface AppointmentResponse {
  message: string;
  appointment: Appointment;
}

export interface DoctorsResponse {
  message: string;
  total: number;
  doctors: DoctorOption[];
}

export interface BookedSlotsResponse {
  message: string;
  doctorEmployeeId: string;
  date: string;
  bookedSlots: string[];
}