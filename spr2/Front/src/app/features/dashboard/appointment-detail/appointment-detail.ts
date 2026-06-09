import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AppointmentService } from '../../../core/services/appointment.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { Appointment } from '../../../core/models/appointment.model';

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
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  appointment = signal<Appointment | null>(null);
  loading = signal(true);
  busy = signal(false);

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

  canComplete = computed(() => {
    const a = this.appointment();
    if (a?.status !== 'BOOKED') {
      return false;
    }
    if (!this.isDoctor()) return false;
    if (
      a.doctorEmployeeId !==
      this.authService.getCurrentUser()?.profile?.employeeCode
    ) {
      return false;
    }
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
        this.appointment.set(res.appointment);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load appointment.');
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
    this.busy.set(true);
    this.appointmentService.cancelAppointment(a.appointmentId, reason).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.toast.success(res.message || 'Appointment cancelled.');
        this.load(a.appointmentId);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err.error?.message || 'Failed to cancel.');
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

    this.busy.set(true);
    this.appointmentService.completeAppointment(a.appointmentId).subscribe({
      next: (res) => {
        this.busy.set(false);
        this.toast.success(res.message || 'Appointment marked completed.');
        this.load(a.appointmentId);
      },
      error: (err) => {
        this.busy.set(false);
        this.toast.error(err.error?.message || 'Failed to complete.');
      },
    });
  }
}
