import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { Appointment } from '../../../core/models/appointment.model';

// Appointment detail; reception can cancel BOOKED, the doctor can complete their own
@Component({
  selector: 'app-appointment-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DashboardLayoutComponent,
    DatePipe,
  ],
  templateUrl: './appointment-detail.html',
  styleUrl: './appointment-detail.css',
})
export class AppointmentDetailComponent implements OnInit {
  private readonly appointmentService = inject(AppointmentService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  appointment = signal<Appointment | null>(null);
  loading = signal(true);

  // Action in flight; all header buttons disable while set
  busyAction = signal<'cancel' | 'complete' | null>(null);
  busy = computed(() => this.busyAction() !== null);

  isDoctor = computed(() => this.authService.getDesignation() === 'DOCTOR');
  hasReceptionAccess = computed(() => {
    const d = this.authService.getDesignation();
    return d === 'OWNER' || d === 'ADMIN' || d === 'RECEPTIONIST';
  });

  canEdit = computed(
    () =>
      this.hasReceptionAccess() &&
      this.appointment()?.status === 'BOOKED',
  );

  canCancel = computed(
    () =>
      this.hasReceptionAccess() &&
      this.appointment()?.status === 'BOOKED',
  );

  // Visibility only; the button enables once the start time passes
  canComplete = computed(() => {
    const a = this.appointment();
    if (a?.status !== 'BOOKED') {
      return false;
    }
    if (!this.isDoctor()) return false;
    return (
      a.doctorEmployeeId ===
      this.authService.getCurrentUser()?.profile?.employeeCode
    );
  });

  // Completable only once the scheduled start (day + slot start) has passed (mirrors the backend guard)
  startTimePassed = computed(() => {
    const a = this.appointment();
    if (!a) return false;
    const slotStart = (a.timeSlot || '').split('-')[0];
    const [h, m] = slotStart.split(':').map(Number);
    const scheduled = new Date(a.appointmentDate);
    if (!Number.isNaN(h) && !Number.isNaN(m)) {
      scheduled.setHours(h, m, 0, 0);
    }
    return scheduled.getTime() <= Date.now();
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('appointmentId');
    if (!id) {
      this.router.navigate(['/dashboard/appointments']);
      return;
    }
    this.load(id);
  }

  private load(id: string): void {
    this.loading.set(true);
    this.appointmentService.getAppointmentById(id).subscribe({
      next: (res) => {
        this.appointment.set(res.data.appointment);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(APP_MESSAGES.LOAD_APPOINTMENT_FAILED);
        this.router.navigate(['/dashboard/appointments']);
      },
    });
  }

  editAppointment(): void {
    const a = this.appointment();
    if (!a) return;
    this.router.navigate(['/dashboard/appointments', a.appointmentId, 'edit']);
  }

  async cancel(): Promise<void> {
    const a = this.appointment();
    if (!a) return;
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
    this.busyAction.set('cancel');
    this.appointmentService.cancelAppointment(a.appointmentId, reason).subscribe({
      next: (res) => {
        this.busyAction.set(null);
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_CANCELLED);
        this.load(a.appointmentId);
      },
      error: (err) => {
        this.busyAction.set(null);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.APPOINTMENT_CANCEL_FAILED));
      },
    });
  }

  async complete(): Promise<void> {
    const a = this.appointment();
    if (!a) return;
    const result = await this.confirmModal.open({
      title: 'Mark as Completed',
      message: `Mark appointment ${a.appointmentId} as completed?`,
      confirmText: 'Mark Completed',
      cancelText: 'Cancel',
      type: 'success',
    });
    if (!result.confirmed) return;

    this.busyAction.set('complete');
    this.appointmentService.completeAppointment(a.appointmentId).subscribe({
      next: (res) => {
        this.busyAction.set(null);
        this.toast.success(res.message || APP_MESSAGES.APPOINTMENT_COMPLETED);
        this.load(a.appointmentId);
      },
      error: (err) => {
        this.busyAction.set(null);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.APPOINTMENT_COMPLETE_FAILED));
      },
    });
  }
}
