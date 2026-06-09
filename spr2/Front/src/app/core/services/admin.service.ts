import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessage } from '../models/api-response.model';
import { CreateEmployeePayload, EmployeeListItem, UpdateEmployeePayload } from '../models/employee.model';
import { AuditLogsResponse } from '../models/audit.model';
import { ProfileChangeRequestsResponse } from '../models/profile-change-request.model';

export interface EmployeesResponse {
  totalEmployees: number;
  employees: EmployeeListItem[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  createEmployee(data: CreateEmployeePayload): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/create-employee`, data);
  }

  getEmployees(): Observable<EmployeesResponse> {
    return this.http.get<EmployeesResponse>(`${this.apiUrl}/employees`);
  }

  getEmployee(employeeCode: string): Observable<EmployeeListItem> {
    return this.http.get<EmployeeListItem>(`${this.apiUrl}/employees/${employeeCode}`);
  }

  getPendingEmployees(): Observable<EmployeesResponse> {
    return this.http.get<EmployeesResponse>(
      `${this.apiUrl}/pending-employees`,
    );
  }

  approveEmployee(employeeCode: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/approve-employee/${employeeCode}`,
      {},
    );
  }

  rejectEmployee(employeeCode: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/reject-employee/${employeeCode}`,
      {},
    );
  }

  updateEmployee(
    employeeCode: string,
    data: UpdateEmployeePayload,
  ): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/update-employee/${employeeCode}`,
      data,
    );
  }

  deleteEmployee(employeeCode: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/delete-employee/${employeeCode}`,
    );
  }

  getAuditLogs(page = 1, limit = 20): Observable<AuditLogsResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    return this.http.get<AuditLogsResponse>(`${this.apiUrl}/audit-logs`, {
      params,
    });
  }
  getProfileChangeRequests(): Observable<ProfileChangeRequestsResponse> {
    return this.http.get<ProfileChangeRequestsResponse>(
      `${this.apiUrl}/profile-change-requests`,
    );
  }

  approveProfileChange(requestId: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/approve-profile-change/${requestId}`,
      {},
    );
  }

  rejectProfileChange(requestId: string): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/reject-profile-change/${requestId}`,
      {},
    );
  }
}
