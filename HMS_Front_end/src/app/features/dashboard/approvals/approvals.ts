import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { EmployeeListItem } from '../../../core/models/employee.model';
import {
  ChangeValue,
  ProfileChangeRequest,
} from '../../../core/models/profile-change-request.model';

type Tab = 'registrations' | 'profileChanges';

// Approvals page (OWNER/ADMIN) with registration and profile-change tabs
@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule, DatePipe, DashboardLayoutComponent],
  templateUrl: './approvals.html',
  styleUrl: './approvals.css',
})
export class ApprovalsComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);

  tab = signal<Tab>('registrations');

  registrations = signal<EmployeeListItem[]>([]);
  changes = signal<ProfileChangeRequest[]>([]);
  loadingReg = signal(true);
  loadingChanges = signal(true);

  selectedRegistration = signal<EmployeeListItem | null>(null);
  selectedChange = signal<ProfileChangeRequest | null>(null);

  totalPending = computed(
    () => this.registrations().length + this.changes().length,
  );

  ngOnInit(): void {
    this.loadRegistrations();
    this.loadChanges();
  }

  switchTab(tab: Tab): void {
    this.tab.set(tab);
  }

  private loadRegistrations(): void {
    this.loadingReg.set(true);
    this.adminService.getPendingEmployees().subscribe({
      next: (res) => {
        this.registrations.set(res.data.employees || []);
        this.loadingReg.set(false);
      },
      error: () => {
        this.loadingReg.set(false);
        this.toast.error(APP_MESSAGES.LOAD_APPROVALS_FAILED);
      },
    });
  }

  private loadChanges(): void {
    this.loadingChanges.set(true);
    this.adminService.getProfileChangeRequests().subscribe({
      next: (res) => {
        this.changes.set(res.data.requests || []);
        this.loadingChanges.set(false);
      },
      error: () => {
        this.loadingChanges.set(false);
        this.toast.error(APP_MESSAGES.LOAD_APPROVALS_FAILED);
      },
    });
  }

  // Registration approvals
  openRegistration(item: EmployeeListItem): void {
    this.selectedRegistration.set(item);
  }

  closeRegistration(): void {
    this.selectedRegistration.set(null);
  }

  async approveRegistration(item: EmployeeListItem): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Approve Registration',
      message: `Approve ${item.employee.name} (${item.employee.employeeCode}) and send their welcome email?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.approveEmployee(item.employee.employeeCode).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.EMPLOYEE_APPROVED);
        this.closeRegistration();
        this.loadRegistrations();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.EMPLOYEE_APPROVE_FAILED));
      },
    });
  }

  async rejectRegistration(item: EmployeeListItem): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Reject Registration',
      message: `Reject the registration request from ${item.employee.name}? They will be notified by email.`,
      confirmText: 'Reject',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.rejectEmployee(item.employee.employeeCode).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.EMPLOYEE_REJECTED);
        this.closeRegistration();
        this.loadRegistrations();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.EMPLOYEE_REJECT_FAILED));
      },
    });
  }

  // Profile change approvals
  openChange(req: ProfileChangeRequest): void {
    this.selectedChange.set(req);
  }

  closeChange(): void {
    this.selectedChange.set(null);
  }

  // Materializes the requestedChanges map into a stable list for the template
  changeEntries(req: ProfileChangeRequest): { field: string; diff: ChangeValue }[] {
    return Object.entries(req.requestedChanges || {}).map(([field, diff]) => ({
      field,
      diff,
    }));
  }

  formatValue(value: any): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  formatField(field: string): string {
    return field
      .replaceAll(/([A-Z])/g, ' $1')
      .replaceAll(/^./g, (c) => c.toUpperCase());
  }

  async approveChange(req: ProfileChangeRequest): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Approve Profile Change',
      message: `Apply the requested changes for ${req.employeeName} (${req.employeeCode})?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.approveProfileChange(req.requestId).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.PROFILE_CHANGE_APPROVED);
        this.closeChange();
        this.loadChanges();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PROFILE_CHANGE_APPROVE_FAILED));
      },
    });
  }

  async rejectChange(req: ProfileChangeRequest): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Reject Profile Change',
      message: `Reject the profile change request from ${req.employeeName}? They will be notified by email.`,
      confirmText: 'Reject',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }
    this.adminService.rejectProfileChange(req.requestId).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.PROFILE_CHANGE_REJECTED);
        this.closeChange();
        this.loadChanges();
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PROFILE_CHANGE_REJECT_FAILED));
      },
    });
  }

  trackByCode = (_: number, item: EmployeeListItem) =>
    item.employee.employeeCode;
  trackByRequest = (_: number, r: ProfileChangeRequest) => r.requestId;
}
