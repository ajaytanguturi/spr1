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
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import {
  Designation,
  EmployeeListItem,
  STAFF_DESIGNATIONS,
} from '../../../core/models/employee.model';

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

  isOwner = computed(
    () => this.authService.getDesignation() === 'OWNER',
  );
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
        this.employees.set(res.employees || []);
        if (this.isOwner()) {
          this.ownerService.getAdmins().subscribe({
            next: (a) => {
              this.admins.set(a.admins || []);
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
        this.toast.error('Failed to load employees.');
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

    obs.subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Employee deleted.');
        this.close();
        this.load();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete employee.');
      },
    });
  }

  trackByCode = (_: number, item: EmployeeListItem) =>
    item.employee.employeeCode;
}
