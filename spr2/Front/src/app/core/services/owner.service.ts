import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiMessage } from '../models/api-response.model';
import { CreateEmployeePayload, EmployeeListItem } from '../models/employee.model';

export interface AdminsResponse {
  totalAdmins: number;
  admins: EmployeeListItem[];
}

@Injectable({
  providedIn: 'root',
})
export class OwnerService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/owner`;

  createAdmin(data: CreateEmployeePayload): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/create-admin`, data);
  }

  getAdmins(): Observable<AdminsResponse> {
    return this.http.get<AdminsResponse>(`${this.apiUrl}/admins`);
  }

  updateAdmin(
    employeeCode: string,
    data: Partial<CreateEmployeePayload>,
  ): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(
      `${this.apiUrl}/update-admin/${employeeCode}`,
      data,
    );
  }

  deleteAdmin(employeeCode: string): Observable<ApiMessage> {
    return this.http.delete<ApiMessage>(
      `${this.apiUrl}/delete-admin/${employeeCode}`,
    );
  }
}
