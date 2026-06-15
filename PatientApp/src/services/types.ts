export type Address = {
  houseName: string;
  houseNumber: string;
  city: string;
  postCode: string;
};

export type EmergencyContact = {
  contactName: string;
  relationship: string;
  contactNumber: string;
};

export type Patient = {
  UHID: string;
  name: string;
  phone: string;
  email: string;
  gender: "Male" | "Female";
  dob: string;
  address: Address;
  emergencyContact: EmergencyContact;
  status: "ACTIVE" | "INACTIVE";
};

export type AvailabilitySlot = {
  day:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  startTime: string;
  endTime: string;
};

export type Doctor = {
  employeeCode: string;
  name: string;
  specialization?: string;
  department?: string;
  consultationFee?: number;
  availabilitySlots?: AvailabilitySlot[];
  qualification?: string[];
  joiningDate?: string;
};

export type AppointmentStatus = "BOOKED" | "CANCELED" | "COMPLETED";

export type Appointment = {
  appointmentId: string;
  patientId: string;
  doctorEmployeeId: string;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  cancellationReason?: string;
  patient?: { UHID: string; name: string; phone: string; email: string } | null;
  doctor?: {
    employeeCode: string;
    name: string;
    specialization?: string;
    department?: string;
    consultationFee?: number;
  } | null;
};

export type RegisterPayload = {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender: "Male" | "Female";
  dob: string;
  address: Address;
  emergencyContact: EmergencyContact;
};

export type ProfileUpdatePayload = {
  phone?: string;
  email?: string;
  address?: Address;
  emergencyContact?: EmergencyContact;
};
