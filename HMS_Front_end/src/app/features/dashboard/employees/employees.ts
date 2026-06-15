import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { LastLoginCellComponent } from '../../../shared/ui/last-login-cell/last-login-cell';
import { AdminService } from '../../../core/services/admin.service';
import { OwnerService } from '../../../core/services/owner.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import {
  Designation,
  EmployeeListItem,
  STAFF_DESIGNATIONS,
} from '../../../core/models/employee.model';

// Active employees list with search and designation filter (OWNER/ADMIN)
@Component({
  selector: 'app-employees-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DashboardLayoutComponent,
    DatePipe,
    LastLoginCellComponent,
  ],
  templateUrl: './employees.html',
  styleUrl: './employees.css',
})
export class EmployeesListComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly ownerService = inject(OwnerService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly router = inject(Router);

  loading = signal(true);
  employees = signal<EmployeeListItem[]>([]);
  admins = signal<EmployeeListItem[]>([]);

  searchTerm = signal('');
  designationFilter = signal<Designation | ''>('');
  designations: (Designation | 'ALL')[] = [
    'ALL',
    ...STAFF_DESIGNATIONS,
    'ADMIN',
  ];

  selected = signal<EmployeeListItem | null>(null);
  deleting = signal(false);

  isOwner = computed(
    () => this.authService.getDesignation() === 'OWNER',
  );

  // Combined view = employees + admins (admins visible only to owner)
  rows = computed<EmployeeListItem[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.designationFilter();
    const all = [...this.employees(), ...this.admins()];

    return all.filter((item) => {
      if (filter && item.employee.designation !== filter) {
        return false;
      }
      if (term) {
        const haystack =
          `${item.employee.name} ${item.employee.employeeCode} ${item.employee.email}`.toLowerCase();
        if (!haystack.includes(term)) {
          return false;
        }
      }
      return true;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.adminService.getEmployees().subscribe({
      next: (res) => {
        this.employees.set(res.data.employees || []);
        if (this.isOwner()) {
          this.ownerService.getAdmins().subscribe({
            next: (a) => {
              this.admins.set(a.data.admins || []);
              this.loading.set(false);
            },
            error: () => {
              this.loading.set(false);
            },
          });
        } else {
          this.loading.set(false);
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(APP_MESSAGES.LOAD_EMPLOYEES_FAILED);
      },
    });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  onFilter(value: string): void {
    this.designationFilter.set(value === 'ALL' || !value ? '' : (value as Designation));
  }

  open(item: EmployeeListItem): void {
    this.selected.set(item);
  }

  close(): void {
    this.selected.set(null);
  }

  editEmployee(item: EmployeeListItem): void {
    this.router.navigate(['/dashboard/employees', item.employee.employeeCode, 'edit']);
  }

  // Only staff designations are editable; OWNER/ADMIN updates are rejected by the backend
  canEdit(item: EmployeeListItem): boolean {
    return item.employee.designation !== 'OWNER' && item.employee.designation !== 'ADMIN';
  }

  async deleteEmployee(item: EmployeeListItem): Promise<void> {
    const isAdmin = item.employee.designation === 'ADMIN';
    const result = await this.confirmModal.open({
      title: `Delete ${isAdmin ? 'Admin' : 'Employee'}`,
      message: `Are you sure you want to delete ${item.employee.name} (${item.employee.employeeCode})? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }

    const obs = isAdmin
      ? this.ownerService.deleteAdmin(item.employee.employeeCode)
      : this.adminService.deleteEmployee(item.employee.employeeCode);

    this.deleting.set(true);
    obs.subscribe({
      next: (res) => {
        this.deleting.set(false);
        this.toast.success(res.message || APP_MESSAGES.EMPLOYEE_DELETED);
        this.close();
        this.load();
      },
      error: (err) => {
        this.deleting.set(false);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.EMPLOYEE_DELETE_FAILED));
      },
    });
  }

  trackByCode = (_: number, item: EmployeeListItem) =>
    item.employee.employeeCode;
}
