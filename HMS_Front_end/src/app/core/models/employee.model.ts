export type Designation =
  | 'OWNER'
  | 'ADMIN'
  | 'DOCTOR'
  | 'RECEPTIONIST'
  | 'CASHIER'
  | 'NURSE'
  | 'LAB_TECH'
  | 'PHARMACIST';

export type Department =
  | 'OPD'
  | 'IPD'
  | 'Lab'
  | 'Pharmacy'
  | 'Administration'
  | 'Reception'
  | 'Billing';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'REJECTED';

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF';

export type WeekDay =
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY'
  | 'SUNDAY';

export interface AvailabilitySlot {
  day: WeekDay;
  startTime: string; 
  endTime: string;  
}

export interface EmployeeProfile {
  employeeCode: string;
  name: string;
  phone: string;
  email: string;
  department: Department;
  designation: Designation;
  joiningDate?: string;
  qualification?: string[];
  medicalRegistrationNumber?: string;
  specialization?: string;
  consultationFee?: number;
  availabilitySlots?: AvailabilitySlot[];
}
export interface EmployeeListItem {
  employee: EmployeeProfile;
  status: EmployeeStatus;
  roles: UserRole[];
  lastLoginAt?: string | null;
}

export interface CreateEmployeePayload {
  username: string;
  name: string;
  phone: string;
  email: string;
  department: Department;
  designation: Designation;
  joiningDate: string;
  qualification: string[];
  medicalRegistrationNumber?: string;
  specialization?: string;
  consultationFee?: number;
  availabilitySlots?: AvailabilitySlot[];
}

export interface UpdateEmployeePayload {
  name?: string;
  phone?: string;
  department?: Department;
  designation?: Designation;
  joiningDate?: string;
  qualification?: string[];
  medicalRegistrationNumber?: string;
  specialization?: string;
  consultationFee?: number;
  availabilitySlots?: AvailabilitySlot[];
}

export const DEPARTMENTS: Department[] = [
  'OPD',
  'IPD',
  'Lab',
  'Pharmacy',
  'Administration',
  'Reception',
  'Billing',
];

export const STAFF_DESIGNATIONS: Designation[] = [
  'DOCTOR',
  'RECEPTIONIST',
  'CASHIER',
  'NURSE',
  'LAB_TECH',
  'PHARMACIST',
];

export const WEEK_DAYS: WeekDay[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export const MEDICAL_DESIGNATIONS: Designation[] = [
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
];

export const SPECIALIZATION_DESIGNATIONS: Designation[] = [
  'DOCTOR',
  'LAB_TECH',
];

export const DEPARTMENT_DESIGNATIONS: Record<Department, Designation[]> = {
  Reception: ['RECEPTIONIST'],
  Lab: ['LAB_TECH'],
  Pharmacy: ['PHARMACIST'],
  Billing: ['CASHIER'],
  Administration: ['ADMIN'],
  OPD: ['DOCTOR', 'NURSE'],
  IPD: ['DOCTOR', 'NURSE'],
};