import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { LastLoginCellComponent } from '../../../shared/ui/last-login-cell/last-login-cell';
import { OwnerService } from '../../../core/services/owner.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { EmployeeListItem } from '../../../core/models/employee.model';

@Component({
  selector: 'app-admins',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardLayoutComponent, DatePipe, LastLoginCellComponent],
  templateUrl: './admins.html',
  styleUrl: './admins.css',
})
export class AdminsComponent implements OnInit {
  private readonly ownerService = inject(OwnerService);
  private readonly toast = inject(ToastService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly router = inject(Router);

  admins = signal<EmployeeListItem[]>([]);
  loading = signal(true);
  selected = signal<EmployeeListItem | null>(null);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.ownerService.getAdmins().subscribe({
      next: (res) => {
        this.admins.set(res.admins || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load admins.');
      },
    });
  }

  open(item: EmployeeListItem): void {
    this.selected.set(item);
  }

  close(): void {
    this.selected.set(null);
  }

  async deleteAdmin(item: EmployeeListItem): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Delete Admin',
      message: `Permanently delete admin ${item.employee.name} (${item.employee.employeeCode})?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) {
      return;
    }
    this.ownerService.deleteAdmin(item.employee.employeeCode).subscribe({
      next: (res) => {
        this.toast.success(res.message || 'Admin deleted.');
        this.close();
        this.load();
      },
      error: (err) => {
        this.toast.error(err.error?.message || 'Failed to delete admin.');
      },
    });
  }

  trackByCode = (_: number, item: EmployeeListItem) =>
    item.employee.employeeCode;
}
