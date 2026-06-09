import { ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { SearchableSelectComponent } from '../../../shared/ui/searchable-select/searchable-select';
import { SlotPickerComponent } from '../../../shared/ui/slot-picker/slot-picker';
import { PatientService } from '../../../core/services/patient.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AppointmentService } from '../../../core/services/appointment.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { Patient } from '../../../core/models/patient.model';
import {
  AvailabilitySlot,
  WeekDay,
} from '../../../core/models/employee.model';
import { DoctorOption } from '../../../core/models/appointment.model';
import {
  noPastDate,
  todayIsoDate,
} from '../../../core/validators/app-validators';

const DRAFT_KEY_CREATE = 'draft:appointment-book';

const SLOT_MINUTES = 30;

const DAY_MAP: Record<number, WeekDay> = {
  0: 'SUNDAY',
  1: 'MONDAY',
  2: 'TUESDAY',
  3: 'WEDNESDAY',
  4: 'THURSDAY',
  5: 'FRIDAY',
  6: 'SATURDAY',
};

@Component({
  selector: 'app-appointment-book',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DashboardLayoutComponent,
    SearchableSelectComponent,
    SlotPickerComponent,
  ],
  templateUrl: './appointment-book.html',
  styleUrl: './appointment-book.css',
})
export class AppointmentBookComponent
  implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly employeeService = inject(EmployeeService);
  private readonly appointmentService = inject(AppointmentService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formDraft = inject(FormDraftService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  form: FormGroup = this.fb.group({
    patientId: ['', Validators.required],
    doctorEmployeeId: ['', Validators.required],
    appointmentDate: ['', [Validators.required, noPastDate]],
    timeSlot: ['', Validators.required],
  });

  private readonly beforeJoiningValidator = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    const joinIso = this.doctorJoinIso();
    if (!value || !joinIso) {
      return null;
    }
    return String(value) < joinIso ? { beforeJoining: true } : null;
  };

  todayIso = todayIsoDate();
  loading = false;
  submittedOk = false;

  mode: 'create' | 'edit' = 'create';

  editAppointmentId: string | null = null;
  private pendingTimeSlot: string | null = null;
  minDate = signal(this.todayIso);
  private readonly doctorJoinIso = signal<string | null>(null);
  doctorJoinDisplay = signal('');
  patients = signal<Patient[]>([]);
  doctors = signal<DoctorOption[]>([]);

  availableSlots = signal<string[]>([]);
  bookedSlots = signal<string[]>([]);
  loadingSlots = signal(false);

  patientOptions = signal<any[]>([]);
  doctorOptions = signal<any[]>([]);

  private readonly patientSearch$ = new Subject<string>();

  get pageTitle(): string {
    return this.mode === 'edit' ? 'Edit Appointment' : 'Book Appointment';
  }

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] ?? 'create') as 'create' | 'edit';
    this.editAppointmentId = this.route.snapshot.paramMap.get('appointmentId');

    if (this.mode === 'edit' && !this.editAppointmentId) {
      this.router.navigate(['/dashboard/appointments']);
      return;
    }

    this.employeeService.getDoctors().subscribe({
      next: (res) => {
        const docs = res.doctors || [];
        this.doctors.set(docs);
        this.doctorOptions.set(
          docs.map((d) => ({
            value: d.employeeCode,
            label: d.name,
            sublabel: d.specialization || d.department || '',
          })),
        );
        this.updateDoctorJoining();
        this.cdr.markForCheck();

        if (this.mode === 'edit' && this.editAppointmentId) {
          this.loadForEdit(this.editAppointmentId);
        }
      },
      error: () => this.toast.error('Failed to load doctors.'),
    });

    this.patientService.getPatients(1, 25).subscribe({
      next: (res) => {
        this.setPatientOptions(res.patients);
      },
      error: () => this.toast.error('Failed to load patients.'),
    });

    this.patientSearch$.pipe(debounceTime(300)).subscribe((term) => {
      if (!term || term.trim().length === 0) {
        this.patientService.getPatients(1, 25).subscribe({
          next: (res) => this.setPatientOptions(res.patients),
        });
        return;
      }
      this.patientService.searchPatients(term).subscribe({
        next: (res) => this.setPatientOptions(res.patients),
      });
    });

    this.form
      .get('appointmentDate')!
      .addValidators(this.beforeJoiningValidator);

    this.form.get('doctorEmployeeId')!.valueChanges.subscribe(() => {
      this.updateDoctorJoining();
      this.refreshSlots();
    });
    this.form.get('appointmentDate')!.valueChanges.subscribe(() =>
      this.refreshSlots(),
    );

    if (this.mode === 'create') {
      const draft = this.formDraft.get(DRAFT_KEY_CREATE);
      if (draft) {
        this.form.patchValue(draft);
      }
      this.form.valueChanges.subscribe(() => {
        if (!this.submittedOk) {
          this.formDraft.save(DRAFT_KEY_CREATE, this.form.getRawValue());
        }
      });
    }
  }

  private loadForEdit(id: string): void {
    this.loading = true;
    this.appointmentService.getAppointmentById(id).subscribe({
      next: (res) => {
        const a = res.appointment;
        if (a.status !== 'BOOKED') {
          this.loading = false;
          this.toast.error('Only BOOKED appointments can be edited.');
          this.router.navigate(['/dashboard/appointments', id]);
          return;
        }

        if (a.patient) {
          const alreadyListed = this.patientOptions().some(
            (o) => o.value === a.patientId,
          );
          if (!alreadyListed) {
            this.patientOptions.set([
              {
                value: a.patientId,
                label: a.patient.name,
                sublabel: `${a.patientId} · ${a.patient.phone}`,
              },
              ...this.patientOptions(),
            ]);
          }
        }
        this.form.get('patientId')!.setValue(a.patientId, { emitEvent: false });
        this.form.get('doctorEmployeeId')!.setValue(a.doctorEmployeeId, { emitEvent: false });
        this.form.get('appointmentDate')!.setValue(
          this.toIso(new Date(a.appointmentDate)),
          { emitEvent: false },
        );

        this.updateDoctorJoining();

        this.pendingTimeSlot = a.timeSlot;
        this.refreshSlots();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Failed to load appointment.');
        this.router.navigate(['/dashboard/appointments']);
      },
    });
  }

  private setPatientOptions(patients: Patient[]): void {
    this.patients.set(patients);
    this.patientOptions.set(
      patients.map((p) => ({
        value: p.UHID,
        label: p.name,
        sublabel: `${p.UHID} · ${p.phone}`,
      })),
    );
  }

  onPatientSearch = (term: string) => this.patientSearch$.next(term);

  private updateDoctorJoining(): void {
    const doctorId = this.form.get('doctorEmployeeId')!.value;
    const doctor = this.doctors().find((d) => d.employeeCode === doctorId);
    const joiningRaw = doctor?.joiningDate;

    if (joiningRaw) {
      const joinDate = new Date(joiningRaw);
      const joinIso = this.toIso(joinDate);

      this.doctorJoinIso.set(joinIso);
      this.doctorJoinDisplay.set(
        joinDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      );

      this.minDate.set(
        this.toIso(
          new Date(
            Math.max(
              new Date(joinIso).getTime(),
              new Date(this.todayIso).getTime(),
            ),
          ),
        ),
      );
    } else {
      this.doctorJoinIso.set(null);
      this.doctorJoinDisplay.set('');
      this.minDate.set(this.todayIso);
    }
    this.form.get('appointmentDate')!.updateValueAndValidity();
  }

  private toIso(d: Date): string {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }

  private refreshSlots(): void {
    const doctorId = this.form.get('doctorEmployeeId')!.value;
    const date = this.form.get('appointmentDate')!.value;

    this.form.patchValue({ timeSlot: '' }, { emitEvent: false });
    this.availableSlots.set([]);
    this.bookedSlots.set([]);

    if (!doctorId || !date) {
      return;
    }
    const doctor = this.doctors().find((d) => d.employeeCode === doctorId);
    if (!doctor) {
      return;
    }
    const weekday = DAY_MAP[new Date(date).getDay()];
    const dayWindows = (doctor.availabilitySlots || []).filter(
      (w) => w.day === weekday,
    );
    const candidate = this.expandSlots(dayWindows);

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const filtered =
      date === todayIsoDate()
        ? candidate.filter(
            (slot) => this.toMinutes(slot.split('-')[0]) > nowMinutes,
          )
        : candidate;

    this.availableSlots.set(filtered);

    if (candidate.length === 0) {
      return;
    }

    this.loadingSlots.set(true);
    this.appointmentService
      .getBookedSlots(
        doctorId,
        date,
        this.mode === 'edit' ? (this.editAppointmentId ?? undefined) : undefined,
      )
      .subscribe({
        next: (res) => {
          this.bookedSlots.set(res.bookedSlots || []);
          this.loadingSlots.set(false);
          if (this.pendingTimeSlot) {
            this.form.patchValue(
              { timeSlot: this.pendingTimeSlot },
              { emitEvent: false },
            );
            this.pendingTimeSlot = null;
          }
        },
        error: () => {
          this.loadingSlots.set(false);
          this.bookedSlots.set([]);
        },
      });
  }

  private expandSlots(windows: AvailabilitySlot[]): string[] {
    const out: string[] = [];
    for (const w of windows) {
      let cur = this.toMinutes(w.startTime);
      const end = this.toMinutes(w.endTime);
      while (cur + SLOT_MINUTES <= end) {
        const next = cur + SLOT_MINUTES;
        out.push(`${this.fmt(cur)}-${this.fmt(next)}`);
        cur = next;
      }
    }
    return out;
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private fmt(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.submittedOk;
  }
  get selectedDoctor(): DoctorOption | null {
    const id = this.form.get('doctorEmployeeId')!.value;
    return this.doctors().find((d) => d.employeeCode === id) || null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    this.loading = true;
    const payload = this.form.getRawValue();

    if (this.mode === 'edit') {
      this.appointmentService
        .updateAppointment(this.editAppointmentId!, payload)
        .subscribe({
          next: (res) => {
            this.loading = false;
            this.cdr.markForCheck();
            this.submittedOk = true;
            this.toast.success(res.message || 'Appointment updated.');
            this.router.navigate([
              '/dashboard/appointments',
              this.editAppointmentId,
            ]);
          },
          error: (err) => {
            this.loading = false;
            this.cdr.markForCheck();
            this.toast.error(
              err.error?.message || 'Failed to update appointment.',
            );
            this.refreshSlots();
          },
        });
    } else {
      this.appointmentService.createAppointment(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.submittedOk = true;
          this.formDraft.clear(DRAFT_KEY_CREATE);
          this.toast.success(res.message || 'Appointment booked.');
          this.router.navigate([
            '/dashboard/appointments',
            res.appointment.appointmentId,
          ]);
        },
        error: (err) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.toast.error(
            err.error?.message || 'Failed to book appointment.',
          );

          this.refreshSlots();
        },
      });
    }
  }

  onCancel(): void {
    if (this.mode === 'edit' && this.editAppointmentId) {
      this.router.navigate(['/dashboard/appointments', this.editAppointmentId]);
    } else {
      this.router.navigate(['/dashboard/appointments']);
    }
  }
}
