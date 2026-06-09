import { EmployeeProfile, Designation, UserRole } from './employee.model';

export interface User {
  employeeCode: string;
  username: string;
  email: string;
  roles: UserRole[];
  mustChangePassword?: boolean;
  lastLoginAt?: string | null;
  profile: EmployeeProfile;
}
export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export interface MeResponse {
  message: string;
  user: User;
}

export type { Designation, UserRole } from './employee.model';

export function getDesignation(user: User | null): Designation | null {
  return user?.profile?.designation ?? null;
}
