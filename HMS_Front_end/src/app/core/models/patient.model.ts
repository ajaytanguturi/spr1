import { ApiResponse, PaginatedData } from './api-response.model';

export type Gender = 'Male' | 'Female';
export type PatientStatus = 'ACTIVE' | 'INACTIVE';

export interface PatientAddress {
  houseName: string;
  houseNumber: string;
  city: string;
  postCode: string;
}

export interface EmergencyContact {
  contactName: string;
  relationship: string;
  contactNumber: string;
}

export interface Patient {
  UHID: string;
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  dob: string;
  address: PatientAddress;
  emergencyContact: EmergencyContact;
  status: PatientStatus;
  mustChangePassword?: boolean;
  createdByEmployeeId?: string;
}

export interface CreatePatientPayload {
  name: string;
  phone: string;
  email: string;
  gender: Gender;
  dob: string;
  address: PatientAddress;
  emergencyContact: EmergencyContact;
  status?: PatientStatus;
}

export interface PatientsData extends PaginatedData {
  patients: Patient[];
}
export type PatientsResponse = ApiResponse<PatientsData>;

export type PatientSearchResponse = ApiResponse<{
  total: number;
  patients: Patient[];
}>;

export type PatientResponse = ApiResponse<{
  patient: Patient;
}>;

export const GENDERS: Gender[] = ['Male', 'Female'];
export const PATIENT_STATUSES: PatientStatus[] = ['ACTIVE', 'INACTIVE'];
