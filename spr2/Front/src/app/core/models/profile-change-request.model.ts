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

export interface ProfileChangeRequestsResponse {
  message: string;
  total: number;
  requests: ProfileChangeRequest[];
}
