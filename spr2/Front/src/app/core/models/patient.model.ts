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

export interface PatientsResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  patients: Patient[];
}
export interface PatientSearchResponse {
  message: string;
  total: number;
  patients: Patient[];
}
export interface PatientResponse {
  message: string;
  patient: Patient;
}

export const GENDERS: Gender[] = ['Male', 'Female'];
export const PATIENT_STATUSES: PatientStatus[] = ['ACTIVE', 'INACTIVE'];
