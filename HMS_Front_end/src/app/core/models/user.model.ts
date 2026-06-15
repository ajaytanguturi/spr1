import { EmployeeProfile, UserRole } from './employee.model';
import { ApiResponse } from './api-response.model';

export interface User {
  employeeCode: string;
  username: string;
  email: string;
  roles: UserRole[];
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  profile: EmployeeProfile;
}

export type LoginResponse = ApiResponse<{
  token: string;
  user: User;
}>;

export type MeResponse = ApiResponse<{
  user: User;
}>;

export type { Designation, UserRole } from './employee.model';
