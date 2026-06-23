import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    CreateMedicalRecordPayload,
    MedicalRecordResponse,
    MedicalRecordsResponse,
    UpdateMedicalRecordPayload,
} from '../models/medical-record.model';
import { ApiMessage } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {
    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/medical-records`;

    // Get all records for a patient (DOCTOR, RECEPTIONIST, ADMIN, OWNER)
    getPatientRecords(patientId: string): Observable<MedicalRecordsResponse> {
        return this.http.get<MedicalRecordsResponse>(
            `${this.apiUrl}/patient/${patientId}`,
        );
    }

    // Create a new medical record (DOCTOR only)
    createRecord(
        data: CreateMedicalRecordPayload,
    ): Observable<MedicalRecordResponse> {
        return this.http.post<MedicalRecordResponse>(this.apiUrl, data);
    }

    // Update an existing record (DOCTOR — own records only, enforced by backend)
    updateRecord(
        recordId: string,
        data: UpdateMedicalRecordPayload,
    ): Observable<MedicalRecordResponse> {
        return this.http.put<MedicalRecordResponse>(
            `${this.apiUrl}/${recordId}`,
            data,
        );
    }

    // Delete a record (ADMIN, OWNER, or creating DOCTOR — enforced by backend)
    deleteRecord(recordId: string): Observable<ApiMessage> {
        return this.http.delete<ApiMessage>(`${this.apiUrl}/${recordId}`);
    }
}