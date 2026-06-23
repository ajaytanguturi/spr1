import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PatientService } from '../../../core/services/patient.service';
import { MedicalRecordService } from '../../../core/services/medical-record.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { ConfirmModalService } from '../../../core/services/confirm-modal.service';
import { FormDraftService } from '../../../core/services/form-draft.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import {
  GENDERS,
  Patient,
  PATIENT_STATUSES,
} from '../../../core/models/patient.model';
import {
  MedicalRecord,
  CreateMedicalRecordPayload,
  UpdateMedicalRecordPayload,
} from '../../../core/models/medical-record.model';
import {
  phoneValidator,
  noFutureDate,
  notBlank,
  nameValidator,
  todayIsoDate,
} from '../../../core/validators/app-validators';

type ActiveTab = 'info' | 'records';
type RecordFormMode = 'create' | 'edit' | null;

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
export class PatientDetailComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly patientService = inject(PatientService);
  private readonly medicalRecordService = inject(MedicalRecordService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly confirmModal = inject(ConfirmModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formDraft = inject(FormDraftService);

  // ── Patient state ──────────────────────────────────────────────────────────
  patient = signal<Patient | null>(null);
  loading = signal(true);
  saving = signal(false);
  editing = signal(false);
  submittedOk = false;

  genders = GENDERS;
  statuses = PATIENT_STATUSES;
  todayIso = todayIsoDate();

  // ── Tab state (default: info; overridden by ?tab=records query param) ──────
  activeTab = signal<ActiveTab>('info');

  // ── Role helpers ───────────────────────────────────────────────────────────
  private designation = computed(() => this.authService.getDesignation());

  canEditPatient = computed(() => {
    const d = this.designation();
    return d === 'OWNER' || d === 'ADMIN' || d === 'RECEPTIONIST';
  });

  isDoctor = computed(() => this.designation() === 'DOCTOR');

  /** Only doctors can create / edit their own records */
  canCreateRecord = computed(() => this.designation() === 'DOCTOR');

  /** Admins and owner can delete any record */
  canDeleteRecord = computed(() => this.authService.isSuperUser());

  // ── Medical records state ──────────────────────────────────────────────────
  medicalRecords = signal<MedicalRecord[]>([]);
  loadingRecords = signal(false);
  recordsLoaded = false; // guard against double-fetch
  recordFormMode = signal<RecordFormMode>(null);
  editingRecordId = signal<string | null>(null);
  savingRecord = signal(false);
  expandedRecordId = signal<string | null>(null);

  // ── Patient edit form ──────────────────────────────────────────────────────
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

  // ── Medical record form ────────────────────────────────────────────────────
  recordForm: FormGroup = this.fb.group({
    visitDate: ['', Validators.required],
    followUpDate: [''],
    diagnosis: ['', [Validators.required, notBlank]],
    symptoms: ['', [Validators.required, notBlank]],
    notes: [''],
    prescription: this.fb.array([]),
  });

  get prescriptionItems(): FormArray {
    return this.recordForm.get('prescription') as FormArray;
  }

  private buildPrescriptionGroup(
    medication = '', dosage = '', duration = '', notes = '',
  ): FormGroup {
    return this.fb.group({
      medication: [medication, Validators.required],
      dosage: [dosage, Validators.required],
      duration: [duration, Validators.required],
      notes: [notes],
    });
  }

  addPrescriptionItem(): void {
    this.prescriptionItems.push(this.buildPrescriptionGroup());
  }

  removePrescriptionItem(index: number): void {
    this.prescriptionItems.removeAt(index);
  }

  // ── Draft key ──────────────────────────────────────────────────────────────
  get draftKey(): string {
    const uhid = this.route.snapshot.paramMap.get('UHID') || 'unknown';
    return `draft:patient-edit:${uhid}`;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    const uhid = this.route.snapshot.paramMap.get('UHID');
    if (!uhid) {
      this.toast.error('Missing patient UHID.');
      this.router.navigate(['/dashboard/patients']);
      return;
    }

    // ── Auto-open records tab when navigated from appointment detail ──────────
    const tabParam = this.route.snapshot.queryParamMap.get('tab');
    if (tabParam === 'records') {
      this.activeTab.set('records');
    }

    this.patientService.getPatientByUHID(uhid).subscribe({
      next: (res) => {
        this.patient.set(res.data.patient);
        this.applyToForm(res.data.patient);

        const draft = this.formDraft.get(this.draftKey);
        if (draft) {
          this.form.patchValue(draft);
          this.editing.set(true);
        }
        this.loading.set(false);

        // If tab=records was requested, load records right away
        if (this.activeTab() === 'records') {
          this.loadMedicalRecords();
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.error(APP_MESSAGES.LOAD_PATIENT_FAILED);
        this.router.navigate(['/dashboard/patients']);
      },
    });

    this.form.valueChanges.subscribe(() => {
      if (this.editing() && !this.submittedOk) {
        this.formDraft.save(this.draftKey, this.form.getRawValue());
      }
    });
  }

  // ── Patient info helpers ───────────────────────────────────────────────────
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

  startEdit(): void { this.editing.set(true); }

  cancelEdit(): void {
    this.editing.set(false);
    this.formDraft.clear(this.draftKey);
    const p = this.patient();
    if (p) this.applyToForm(p);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }
    const p = this.patient();
    if (!p) return;

    this.saving.set(true);
    this.patientService.updatePatient(p.UHID, this.form.getRawValue()).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.submittedOk = true;
        this.formDraft.clear(this.draftKey);
        this.patient.set(res.data.patient);
        this.applyToForm(res.data.patient);
        this.editing.set(false);
        this.toast.success(res.message || APP_MESSAGES.PATIENT_UPDATED);
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(this.apiError.message(err, APP_MESSAGES.PATIENT_UPDATE_FAILED));
      },
    });
  }

  addressCtrl(name: string) { return this.form.get(['address', name]); }
  emergencyCtrl(name: string) { return this.form.get(['emergencyContact', name]); }

  // ── Tab switching ──────────────────────────────────────────────────────────
  switchToRecords(): void {
    this.activeTab.set('records');
    if (!this.recordsLoaded) this.loadMedicalRecords();
  }

  // ── Medical records ────────────────────────────────────────────────────────
  private loadMedicalRecords(): void {
    const p = this.patient();
    if (!p) return;
    this.loadingRecords.set(true);
    this.medicalRecordService.getPatientRecords(p.UHID).subscribe({
      next: (res) => {
        this.medicalRecords.set(res.data.records || []);
        this.loadingRecords.set(false);
        this.recordsLoaded = true;
        // Auto-open create form for doctors if no records yet
        if (this.canCreateRecord() && res.data.records.length === 0) {
          this.openCreateRecord();
        }
      },
      error: () => {
        this.loadingRecords.set(false);
        this.toast.error(APP_MESSAGES.LOAD_MEDICAL_RECORDS_FAILED);
      },
    });
  }

  toggleRecord(recordId: string): void {
    this.expandedRecordId.set(
      this.expandedRecordId() === recordId ? null : recordId,
    );
  }

  canEditThisRecord(record: MedicalRecord): boolean {
    if (!this.canCreateRecord()) return false;
    const myCode = this.authService.getCurrentUser()?.profile?.employeeCode;
    return record.doctorEmployeeId === myCode;
  }

  // ── Record form helpers ────────────────────────────────────────────────────
  openCreateRecord(): void {
    this.prescriptionItems.clear();
    this.addPrescriptionItem();
    this.recordForm.reset({
      visitDate: this.todayIso, // pre-fill today
      followUpDate: '',
      diagnosis: '',
      symptoms: '',
      notes: '',
    });
    this.editingRecordId.set(null);
    this.recordFormMode.set('create');
  }

  openEditRecord(record: MedicalRecord): void {
    this.prescriptionItems.clear();
    if (record.prescription.length > 0) {
      record.prescription.forEach((item) =>
        this.prescriptionItems.push(
          this.buildPrescriptionGroup(
            item.medication, item.dosage, item.duration, item.notes ?? '',
          ),
        ),
      );
    } else {
      this.addPrescriptionItem();
    }

    this.recordForm.patchValue({
      visitDate: record.visitDate ? record.visitDate.substring(0, 10) : '',
      followUpDate: record.followUpDate ? record.followUpDate.substring(0, 10) : '',
      diagnosis: record.diagnosis,
      symptoms: record.symptoms.join(', '),
      notes: record.notes ?? '',
    });

    this.editingRecordId.set(record.recordId);
    this.recordFormMode.set('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeRecordForm(): void {
    this.recordFormMode.set(null);
    this.editingRecordId.set(null);
    this.recordForm.reset();
    this.prescriptionItems.clear();
  }

  submitRecord(): void {
    if (this.recordForm.invalid) {
      this.recordForm.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const raw = this.recordForm.getRawValue();
    const p = this.patient();
    if (!p) return;

    const symptoms: string[] = String(raw['symptoms'] ?? '')
      .split(',')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    this.savingRecord.set(true);

    if (this.recordFormMode() === 'create') {
      const payload: CreateMedicalRecordPayload = {
        patientId: p.UHID,
        appointmentId: raw['appointmentId'] || undefined,
        visitDate: raw['visitDate'],
        diagnosis: raw['diagnosis'],
        symptoms,
        prescription: raw['prescription'] ?? [],
        notes: raw['notes'] || undefined,
        followUpDate: raw['followUpDate'] || undefined,
      };
      this.medicalRecordService.createRecord(payload).subscribe({
        next: (res) => {
          this.savingRecord.set(false);
          this.toast.success(res.message || APP_MESSAGES.MEDICAL_RECORD_CREATED);
          this.closeRecordForm();
          this.recordsLoaded = false;
          this.loadMedicalRecords();
        },
        error: (err) => {
          this.savingRecord.set(false);
          this.toast.error(this.apiError.message(err, APP_MESSAGES.MEDICAL_RECORD_CREATE_FAILED));
        },
      });
    } else if (this.recordFormMode() === 'edit' && this.editingRecordId()) {
      const payload: UpdateMedicalRecordPayload = {
        visitDate: raw['visitDate'],
        diagnosis: raw['diagnosis'],
        symptoms,
        prescription: raw['prescription'] ?? [],
        notes: raw['notes'] || undefined,
        followUpDate: raw['followUpDate'] || undefined,
      };
      this.medicalRecordService.updateRecord(this.editingRecordId()!, payload).subscribe({
        next: (res) => {
          this.savingRecord.set(false);
          this.toast.success(res.message || APP_MESSAGES.MEDICAL_RECORD_UPDATED);
          this.closeRecordForm();
          this.recordsLoaded = false;
          this.loadMedicalRecords();
        },
        error: (err) => {
          this.savingRecord.set(false);
          this.toast.error(this.apiError.message(err, APP_MESSAGES.MEDICAL_RECORD_UPDATE_FAILED));
        },
      });
    }
  }

  async deleteRecord(record: MedicalRecord): Promise<void> {
    const result = await this.confirmModal.open({
      title: 'Delete Medical Record',
      message: `Delete the record dated ${new Date(record.visitDate).toLocaleDateString()}? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (!result.confirmed) return;

    this.medicalRecordService.deleteRecord(record.recordId).subscribe({
      next: (res) => {
        this.toast.success(res.message || APP_MESSAGES.MEDICAL_RECORD_DELETED);
        this.medicalRecords.update((list) =>
          list.filter((r) => r.recordId !== record.recordId),
        );
        if (this.expandedRecordId() === record.recordId) {
          this.expandedRecordId.set(null);
        }
      },
      error: (err) => {
        this.toast.error(this.apiError.message(err, APP_MESSAGES.MEDICAL_RECORD_DELETE_FAILED));
      },
    });
  }

  // ── Unsaved-changes guard ──────────────────────────────────────────────────
  hasUnsavedChanges(): boolean {
    return (
      (this.editing() && this.form.dirty && !this.submittedOk) ||
      (this.recordFormMode() !== null && this.recordForm.dirty)
    );
  }
}