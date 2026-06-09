import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import {
  GENDERS,
  Patient,
  PATIENT_STATUSES,
} from '../../../core/models/patient.model';
import {
  phoneValidator,
  noFutureDate,
  notBlank,
  nameValidator,
  todayIsoDate,
} from '../../../core/validators/app-validators';

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DashboardLayoutComponent,
    DatePipe,
  ],
  templateUrl: './patient-detail.html',
  styleUrl: './patient-detail.css',
})
export class PatientDetailComponent
  implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formDraft = inject(FormDraftService);

  patient = signal<Patient | null>(null);
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  submittedOk = false;

  genders = GENDERS;
  statuses = PATIENT_STATUSES;
  todayIso = todayIsoDate();

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, notBlank, nameValidator]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, phoneValidator]],
    gender: ['', Validators.required],
    dob: ['', [Validators.required, noFutureDate]],
    status: ['ACTIVE', Validators.required],
    address: this.fb.group({
      houseName: ['', [Validators.required, notBlank]],
      houseNumber: ['', [Validators.required, notBlank]],
      city: ['', [Validators.required, notBlank]],
      postCode: ['', [Validators.required, notBlank]],
    }),
    emergencyContact: this.fb.group({
      contactName: ['', [Validators.required, notBlank, nameValidator]],
      relationship: ['', [Validators.required, notBlank]],
      contactNumber: ['', [Validators.required, phoneValidator]],
    }),
  });

  get draftKey(): string {
    const uhid = this.route.snapshot.paramMap.get('UHID') || 'unknown';
    return `draft:patient-edit:${uhid}`;
  }

  ngOnInit(): void {
    const uhid = this.route.snapshot.paramMap.get('UHID');
    if (!uhid) {
      this.toast.error('Missing patient UHID.');
      this.router.navigate(['/dashboard/patients']);
      return;
    }

    this.patientService.getPatientByUHID(uhid).subscribe({
      next: (res) => {
        this.patient.set(res.patient);
        this.applyToForm(res.patient);
        const draft = this.formDraft.get(this.draftKey);
        if (draft) {
          this.form.patchValue(draft);
          this.editing.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Failed to load patient.');
        this.router.navigate(['/dashboard/patients']);
      },
    });

    this.form.valueChanges.subscribe(() => {
      if (this.editing() && !this.submittedOk) {
        this.formDraft.save(this.draftKey, this.form.getRawValue());
      }
    });
  }

  private applyToForm(p: Patient): void {
    this.form.patchValue({
      name: p.name,
      email: p.email,
      phone: p.phone,
      gender: p.gender,
      dob: p.dob ? p.dob.substring(0, 10) : '',
      status: p.status,
      address: p.address,
      emergencyContact: p.emergencyContact,
    });
    this.form.markAsPristine();
  }

  startEdit(): void {
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
    this.formDraft.clear(this.draftKey);
    const p = this.patient();
    if (p) {
      this.applyToForm(p);
    }
  }

  hasUnsavedChanges(): boolean {
    return this.editing() && this.form.dirty && !this.submittedOk;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const p = this.patient();
    if (!p) {
      return;
    }

    this.saving.set(true);
    this.patientService.updatePatient(p.UHID, this.form.getRawValue()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.submittedOk = true;
        this.formDraft.clear(this.draftKey);
        this.patient.set(res.patient);
        this.applyToForm(res.patient);
        this.editing.set(false);
        this.toast.success(res.message || 'Patient updated.');
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(err.error?.message || 'Failed to update patient.');
      },
    });
  }

  addressCtrl(name: string) {
    return this.form.get(['address', name]);
  }
  emergencyCtrl(name: string) {
    return this.form.get(['emergencyContact', name]);
  }
}
