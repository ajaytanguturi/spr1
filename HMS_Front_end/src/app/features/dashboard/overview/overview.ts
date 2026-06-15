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

// Dashboard landing; renders cards based on the user's designation
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

  // Stats
  activeEmployees = signal<number | null>(null);
  pendingApprovals = signal<number | null>(null);
  totalPatients = signal<number | null>(null);
  // All booked appointments (shown to owner/admin/receptionist)
  bookedAppointments = signal<number | null>(null);

  // Recent activity (audit log feed)
  auditLogs = signal<AuditLog[]>([]);
  loadingAudit = signal(false);

  // Doctor-specific
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

    // Count STAFF for admins, STAFF + admins for the owner, to match the Employees list
    const adminsForOwner =
      this.designation === 'OWNER'
        ? this.ownerService
          .getAdmins()
          .pipe(catchError(() => of({ data: { totalAdmins: 0, admins: [] } } as any)))
        : of({ data: { totalAdmins: 0, admins: [] } } as any);

    forkJoin({
      employees: this.adminService
        .getEmployees()
        .pipe(catchError(() => of({ data: { totalEmployees: 0, employees: [] } } as any))),
      admins: adminsForOwner,
      pending: this.adminService
        .getPendingEmployees()
        .pipe(catchError(() => of({ data: { totalEmployees: 0, employees: [] } } as any))),
      pendingChanges: this.adminService
        .getProfileChangeRequests()
        .pipe(catchError(() => of({ data: { total: 0, requests: [] } } as any))),
      patients: this.patientService
        .getPatients(1, 1)
        .pipe(catchError(() => of({ data: { total: 0 } } as any))),
      appts: this.appointmentService
        .getAppointments(1, 1, { status: 'BOOKED' })
        .pipe(catchError(() => of({ data: { total: 0 } } as any))),
      logs: this.adminService
        .getAuditLogs(1, 15)
        .pipe(catchError(() => of({ data: { logs: [] } } as any))),
    }).subscribe((res) => {
      this.activeEmployees.set(
        (res.employees.data.totalEmployees || 0) + (res.admins.data.totalAdmins || 0),
      );
      this.pendingApprovals.set(
        (res.pending.data.totalEmployees || 0) + (res.pendingChanges.data.total || 0),
      );
      this.totalPatients.set(res.patients.data.total || 0);
      this.bookedAppointments.set(res.appts.data.total || 0);
      this.auditLogs.set(res.logs.data.logs || []);
      this.loading.set(false);
      this.loadingAudit.set(false);
    });
  }

  private loadReceptionistOverview(): void {
    forkJoin({
      patients: this.patientService
        .getPatients(1, 1)
        .pipe(catchError(() => of({ data: { total: 0 } } as any))),
      appts: this.appointmentService
        .getAppointments(1, 1, { status: 'BOOKED' })
        .pipe(catchError(() => of({ data: { total: 0 } } as any))),
    }).subscribe((res) => {
      this.totalPatients.set(res.patients.data.total || 0);
      this.bookedAppointments.set(res.appts.data.total || 0);
      this.loading.set(false);
    });
  }

  private loadDoctorOverview(): void {
    const today = todayIsoDate();
    forkJoin({
      todayList: this.appointmentService
        .getMyAppointments(1, 100, { date: today })
        .pipe(catchError(() => of({ data: { total: 0, appointments: [] } } as any))),
      all: this.appointmentService
        .getMyAppointments(1, 200, { status: 'BOOKED' })
        .pipe(catchError(() => of({ data: { total: 0, appointments: [] } } as any))),
    }).subscribe((res) => {
      this.myAppointmentsToday.set(res.todayList.data.total || 0);

      // Upcoming = booked AFTER today
      const upcoming = (res.all.data.appointments as Appointment[]).filter((a) => {
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

  // Short action label for the activity feed
  actionLabel(action: string): string {
    return action
      .replaceAll('_', ' ')
      .toLowerCase()
      .replaceAll(/\b\w/g, (letter) => letter.toUpperCase());
  }
}