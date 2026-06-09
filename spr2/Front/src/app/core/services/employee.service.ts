import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MeResponse } from '../models/user.model';
import { DoctorsResponse } from '../models/appointment.model';

export interface ProfileUpdateRequestResponse {
  message: string;
  request: {
    requestId: string;
    status: string;
    requestedChanges: Record<string, { old?: any; new?: any }>;
  };
}
export interface ProfileUpdatePayload {
  phone?: string;
  qualification?: string[];
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/employees`;
  getMe(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`);
  }
  getDoctors(): Observable<DoctorsResponse> {
    return this.http.get<DoctorsResponse>(`${this.apiUrl}/doctors`);
  }
  profileUpdate(
    data: ProfileUpdatePayload,
  ): Observable<ProfileUpdateRequestResponse> {
    return this.http.put<ProfileUpdateRequestResponse>(
      `${this.apiUrl}/update-profile`,
      data,
    );
  }
}