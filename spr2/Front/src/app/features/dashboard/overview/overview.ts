import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AuthService } from '../../../core/services/auth.service';
import { AdminService } from '../../../core/services/admin.service';
import { OwnerService } from '../../../core/services/owner.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { PatientService } from '../../../core/services/patient.service';
import { AuditLog } from '../../../core/models/audit.model';
import { Appointment } from '../../../core/models/appointment.model';
import { todayIsoDate } from '../../../core/validators/app-validators';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, DashboardLayoutComponent, DatePipe],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class OverviewComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminService = inject(AdminService);
  private readonly ownerService = inject(OwnerService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly patientService = inject(PatientService);

  activeEmployees = signal<number | null>(null);
  pendingApprovals = signal<number | null>(null);
  totalPatients = signal<number | null>(null);

  bookedAppointments = signal<number | null>(null);
  auditLogs = signal<AuditLog[]>([]);
  loadingAudit = signal(false);

  myAppointmentsToday = signal<number | null>(null);
  myAppointmentsUpcoming = signal<number | null>(null);

  loading = signal(true);

  get user() {
    return this.authService.getCurrentUser();
  }

  get designation(): string {
    return this.authService.getDesignation() || '';
  }

  isOwnerOrAdmin = computed(() => this.authService.isSuperUser());
  isReceptionist = computed(() => this.designation === 'RECEPTIONIST');
  isDoctor = computed(() => this.designation === 'DOCTOR');
  hasReceptionAccess = computed(
    () => this.isOwnerOrAdmin() || this.isReceptionist(),
  );

  ngOnInit(): void {
    if (this.isOwnerOrAdmin()) {
      this.loadAdminOverview();
    } else if (this.isReceptionist()) {
      this.loadReceptionistOverview();
    } else if (this.isDoctor()) {
      this.loadDoctorOverview();
    } else {
      this.loading.set(false);
    }
  }

  private loadAdminOverview(): void {
    this.loadingAudit.set(true);

    const adminsForOwner =
      this.designation === 'OWNER'
        ? this.ownerService
          .getAdmins()
          .pipe(catchError(() => of({ totalAdmins: 0, admins: [] } as any)))
        : of({ totalAdmins: 0, admins: [] } as any);

    forkJoin({
      employees: this.adminService
        .getEmployees()
        .pipe(catchError(() => of({ totalEmployees: 0, employees: [] }))),
      admins: adminsForOwner,
      pending: this.adminService
        .getPendingEmployees()
        .pipe(catchError(() => of({ totalEmployees: 0, employees: [] }))),
      pendingChanges: this.adminService
        .getProfileChangeRequests()
        .pipe(catchError(() => of({ total: 0, requests: [] } as any))),
      patients: this.patientService
        .getPatients(1, 1)
        .pipe(catchError(() => of({ total: 0 } as any))),
      appts: this.appointmentService
        .getAppointments(1, 1, { status: 'BOOKED' })
        .pipe(catchError(() => of({ total: 0 } as any))),
      logs: this.adminService
        .getAuditLogs(1, 15)
        .pipe(catchError(() => of({ logs: [] } as any))),
    }).subscribe((res) => {
      this.activeEmployees.set(
        (res.employees.totalEmployees || 0) + (res.admins.totalAdmins || 0),
      );
      this.pendingApprovals.set(
        (res.pending.totalEmployees || 0) + (res.pendingChanges.total || 0),
      );
      this.totalPatients.set(res.patients.total || 0);
      this.bookedAppointments.set(res.appts.total || 0);
      this.auditLogs.set(res.logs.logs || []);
      this.loading.set(false);
      this.loadingAudit.set(false);
    });
  }

  private loadReceptionistOverview(): void {
    forkJoin({
      patients: this.patientService
        .getPatients(1, 1)
        .pipe(catchError(() => of({ total: 0 } as any))),
      appts: this.appointmentService
        .getAppointments(1, 1, { status: 'BOOKED' })
        .pipe(catchError(() => of({ total: 0 } as any))),
    }).subscribe((res) => {
      this.totalPatients.set(res.patients.total || 0);
      this.bookedAppointments.set(res.appts.total || 0);
      this.loading.set(false);
    });
  }

  private loadDoctorOverview(): void {
    const today = todayIsoDate();
    forkJoin({
      todayList: this.appointmentService
        .getMyAppointments(1, 100, { date: today })
        .pipe(catchError(() => of({ total: 0, appointments: [] } as any))),
      all: this.appointmentService
        .getMyAppointments(1, 200, { status: 'BOOKED' })
        .pipe(catchError(() => of({ total: 0, appointments: [] } as any))),
    }).subscribe((res) => {
      this.myAppointmentsToday.set(res.todayList.total || 0);

      const upcoming = (res.all.appointments as Appointment[]).filter((a) => {
        const d = new Date(a.appointmentDate);
        d.setHours(0, 0, 0, 0);
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return d.getTime() > t.getTime();
      });
      this.myAppointmentsUpcoming.set(upcoming.length);
      this.loading.set(false);
    });
  }

  trackByAudit = (_: number, log: AuditLog) => log.auditId;

  actionLabel(action: string): string {
    return action
      .replaceAll('_', ' ')
      .toLowerCase()
      .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());
  }
}