import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import {
  Appointment,
  APPOINTMENT_STATUSES,
} from '../../../core/models/appointment.model';
import { todayIsoDate } from '../../../core/validators/app-validators';

type DoctorTab = 'today' | 'upcoming' | 'completed';
type BusyAction = 'cancel' | 'complete' | 'approve' | 'reject';

// Role-aware appointments list (reception sees all with PENDING_REVIEW; doctor sees own by tab)
@Component({
  selector: 'app-appointments-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DashboardLayoutComponent,
    DatePipe,
    TitleCasePipe,
  ],
  templateUrl: './appointments-list.html',
  styleUrl: './appointments-list.css',
})
export class AppointmentsListComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  loading = signal(true);
  appointments = signal<Appointment[]>([]);

  // Row action in flight
  busyId = signal<string | null>(null);
  busyAction = signal<BusyAction | null>(null);

  statuses = APPOINTMENT_STATUSES;
  statusFilter = signal<string>('');
  dateFilter = signal<string>('');

  // Doctor tabs
  doctorTab = signal<DoctorTab>('today');
  todayIso = todayIsoDate();

  // Pagination (reception view)
  page = signal(1);
  limit = 10;
  totalPages = signal(1);
  total = signal(0);

  isDoctor = computed(() => this.authService.getDesignation() === 'DOCTOR');
  hasReceptionAccess = computed(() => {
    const d = this.authService.getDesignation();
    return d === 'OWNER' || d === 'ADMIN' || d === 'RECEPTIONIST';
  });

  // For the doctor view, slice by selected tab
  visibleAppointments = computed<Appointment[]>(() => {
    if (!this.isDoctor()) {
      return this.appointments();
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.appointments().filter((a) => {
      const apptDate = new Date(a.appointmentDate);
      apptDate.setHours(0, 0, 0, 0);
      const isToday = apptDate.getTime() === today.getTime();
      const isUpcoming = apptDate.getTime() > today.getTime();

      switch (this.doctorTab()) {
        case 'today':
          return isToday && a.status === 'BOOKED';
        case 'upcoming':
          return isUpcoming && a.status === 'BOOKED';
        case 'completed':
          return a.status === 'COMPLETED';
      }
    });
  });

  doctorTabCount(tab: DoctorTab): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.appointments().filter((a) => {
      const d = new Date(a.appointmentDate);
      d.setHours(0, 0, 0, 0);
      switch (tab) {
        case 'today':
          return d.getTime() === today.getTime() && a.status === 'BOOKED';
        case 'upcoming':
          return d.getTime() > today.getTime() && a.status === 'BOOKED';
        case 'completed':
          return a.status === 'COMPLETED';
      }
    }).length;
  }

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'today' || tab === 'upcoming' || tab === 'completed') {
      this.doctorTab.set(tab);
    }
    const status = this.route.snapshot.queryParamMap.get('status');
    if (status) {
      this.statusFilter.set(status);
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);

    if (this.isDoctor()) {
      this.appointmentService.getMyAppointments(1, 200).subscribe({
        next: (res) => {
          this.appointments.set(res.data.appointments || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(APP_MESSAGES.LOAD_APPOINTMENTS_FAILED);
        },
      });
      return;
    }

    this.appointmentService
      .getAppointments(this.page(), this.limit, {
        status: this.statusFilter() || undefined,
        date: this.dateFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.appointments.set(res.data.appointments || []);
          this.totalPages.set(res.data.totalPages || 1);
          this.total.set(res.data.total || 0);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error(APP_MESSAGES.LOAD_APPOINTMENTS_FAILED);
        },
      });
  }

  switchTab(tab: DoctorTab): void {
    this.doctorTab.set(tab);
  }

  isStartTimePassed(a: Appointment): boolean {
    const slotStart = (a.timeSlot || '').split('-')[0];
    const [h, m] = slotStart.split(':').map(Number);
    const scheduled = new Date(a.appointmentDate);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      scheduled.setHours(h, m, 0, 0);
    }
    return scheduled.getTime() <= Date.now();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  onDateChange(value: string): void {
    this.dateFilter.set(value);
    this.page.set(1);
    this.load();
  }

  clearDate(): void {
    this.dateFilter.set('');
    this.page.set(1);
    this.load();
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  open(a: Appointment): void {
    this.router.navigate(['/dashboard/appointments', a.appointmentId]);
  }

  // ── Approve PENDING_REVIEW ──────────────────────────────────────────────────
  async approve(a: Appointment, event: Event): Promise<void> {
    event.stopPropagation();
    const result = await this.confirmModal.open({
      title: 'Approve Appointment',
      message: `Approve appointment ${a.appointmentId}? The slot will be confirmed and the patient notified.`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!result.confirmed) return;

    this.busyId.set(a.appointmentId);
    this.busyAction.set('approve');
    this.appointmentService.approveAppointment(a.appointmentId).subscribe({
      next: (res) => {
        this.clearBusy();
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_REVIEW_APPROVED);
        this.load();
      },
      error: (err) => {
        this.clearBusy();
        this.toast.error(
          this.apiError.message(err, APP_MESSAGES.APPOINTMENT_REVIEW_APPROVE_FAILED),
        );
      },
    });
  }

  // ── Reject PENDING_REVIEW ───────────────────────────────────────────────────
  async reject(a: Appointment, event: Event): Promise<void> {
    event.stopPropagation();
    const result = await this.confirmModal.open({
      title: 'Reject Appointment',
      message: `Reject appointment ${a.appointmentId}? The patient will be notified.`,
      confirmText: 'Reject',
      cancelText: 'Keep',
      type: 'danger',
      showInput: true,
      inputLabel: 'Rejection Reason',
      inputPlaceholder: 'Reason for rejecting this appointment',
    });
    if (!result.confirmed) return;

    const reason = (result.inputValue ?? '').trim();
    this.busyId.set(a.appointmentId);
    this.busyAction.set('reject');
    this.appointmentService.rejectAppointment(a.appointmentId, reason).subscribe({
      next: (res) => {
        this.clearBusy();
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_REVIEW_REJECTED);
        this.load();
      },
      error: (err) => {
        this.clearBusy();
        this.toast.error(
          this.apiError.message(err, APP_MESSAGES.APPOINTMENT_REVIEW_REJECT_FAILED),
        );
      },
    });
  }

  // ── Cancel BOOKED ───────────────────────────────────────────────────────────
  async cancel(a: Appointment, event: Event): Promise<void> {
    event.stopPropagation();
    const result = await this.confirmModal.open({
      title: 'Cancel Appointment',
      message: `Cancel appointment ${a.appointmentId}? The slot will become available again.`,
      confirmText: 'Cancel It',
      cancelText: 'Keep',
      type: 'danger',
      showInput: true,
      inputLabel: 'Cancellation Reason',
      inputPlaceholder: 'Reason for cancelling this appointment',
    });
    if (!result.confirmed) return;

    const reason = (result.inputValue ?? '').trim();
    this.busyId.set(a.appointmentId);
    this.busyAction.set('cancel');
    this.appointmentService.cancelAppointment(a.appointmentId, reason).subscribe({
      next: (res) => {
        this.clearBusy();
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_CANCELLED);
        this.load();
      },
      error: (err) => {
        this.clearBusy();
        this.toast.error(
          this.apiError.message(err, APP_MESSAGES.APPOINTMENT_CANCEL_FAILED),
        );
      },
    });
  }

  // ── Complete BOOKED ─────────────────────────────────────────────────────────
  async complete(a: Appointment, event: Event): Promise<void> {
    event.stopPropagation();
    const result = await this.confirmModal.open({
      title: 'Mark as Completed',
      message: `Mark appointment ${a.appointmentId} as completed?`,
      confirmText: 'Mark Completed',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!result.confirmed) return;

    this.busyId.set(a.appointmentId);
    this.busyAction.set('complete');
    this.appointmentService.completeAppointment(a.appointmentId).subscribe({
      next: (res) => {
        this.clearBusy();
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_COMPLETED);
        this.load();
      },
      error: (err) => {
        this.clearBusy();
        this.toast.error(
          this.apiError.message(err, APP_MESSAGES.APPOINTMENT_COMPLETE_FAILED),
        );
      },
    });
  }

  private clearBusy(): void {
    this.busyId.set(null);
    this.busyAction.set(null);
  }

  trackById = (_: number, a: Appointment) => a.appointmentId;
}