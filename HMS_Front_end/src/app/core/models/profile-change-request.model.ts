import { ApiResponse } from './api-response.model';

export type ProfileChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ChangeValue {
  old?: any;
  new?: any;
}

export interface RequestedChanges {
  [field: string]: ChangeValue;
}

export interface ProfileChangeRequest {
  requestId: string;
  employeeCode: string;
  employeeName: string;
  email: string;
  requestedChanges: RequestedChanges;
  status: ProfileChangeStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  created_at: string;
}

export type ProfileChangeRequestsResponse = ApiResponse<{
  total: number;
  requests: ProfileChangeRequest[];
}>;
