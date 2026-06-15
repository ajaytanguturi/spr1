import { AvailabilitySlot } from './employee.model';
import { ApiResponse, PaginatedData } from './api-response.model';

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

export interface AppointmentsData extends PaginatedData {
  appointments: Appointment[];
}
export type AppointmentsResponse = ApiResponse<AppointmentsData>;

export type AppointmentResponse = ApiResponse<{
  appointment: Appointment;
}>;

export type DoctorsResponse = ApiResponse<{
  total: number;
  doctors: DoctorOption[];
}>;

export type BookedSlotsResponse = ApiResponse<{
  doctorEmployeeId: string;
  date: string;
  bookedSlots: string[];
}>;