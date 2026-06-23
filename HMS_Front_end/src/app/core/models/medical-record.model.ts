import { ApiResponse } from './api-response.model';

export interface PrescriptionItem {
    medication: string;
    dosage: string;
    duration: string;
    notes?: string;
}

export interface MedicalRecord {
    recordId: string;
    patientId: string;         // UHID
    doctorEmployeeId: string;
    appointmentId?: string;
    visitDate: string;
    diagnosis: string;
    symptoms: string[];
    prescription: PrescriptionItem[];
    notes?: string;
    followUpDate?: string;
    doctorName?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateMedicalRecordPayload {
    patientId: string;
    appointmentId?: string;
    visitDate: string;
    diagnosis: string;
    symptoms: string[];
    prescription: PrescriptionItem[];
    notes?: string;
    followUpDate?: string;
}

export type UpdateMedicalRecordPayload = Partial<
    Omit<CreateMedicalRecordPayload, 'patientId'>
>;

export type MedicalRecordsResponse = ApiResponse<{
    total: number;
    records: MedicalRecord[];
}>;

export type MedicalRecordResponse = ApiResponse<{
    record: MedicalRecord;
}>;