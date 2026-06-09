export type AuditAction =
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_APPROVED'
  | 'EMPLOYEE_REJECTED'
  | 'EMPLOYEE_UPDATED'
  | 'EMPLOYEE_DELETED'
  | 'ADMIN_CREATED'
  | 'ADMIN_UPDATED'
  | 'ADMIN_DELETED'
  | 'PATIENT_CREATED'
  | 'PATIENT_UPDATED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_CANCELED'
  | 'APPOINTMENT_COMPLETED'
  | 'PROFILE_CHANGE_REQUESTED'
  | 'PROFILE_CHANGE_APPROVED'
  | 'PROFILE_CHANGE_REJECTED';

export interface AuditLog {
  auditId: string;
  actorEmployeeCode?: string;
  actorName?: string;
  actorDesignation?: string;
  action: AuditAction;
  targetType?: string;
  targetId?: string;
  message: string;
  created_at: string;
}

export interface AuditLogsResponse {
  message: string;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  logs: AuditLog[];
}
