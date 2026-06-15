import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormArray,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiErrorHandlerService } from '../../../core/services/api-error-handler.service';
import { APP_MESSAGES } from '../../../core/constants/messages';
import { FormDraftService } from '../../../core/services/form-draft.service';
import {
  STAFF_DESIGNATIONS,
  DEPARTMENTS,
  DEPARTMENT_DESIGNATIONS,
  WEEK_DAYS,
  MEDICAL_DESIGNATIONS,
  SPECIALIZATION_DESIGNATIONS,
  Designation,
  Department,
} from '../../../core/models/employee.model';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import {
  phoneValidator,
  passwordComplexity,
  passwordMatchValidator,
  nonNegative,
  slotTimeOrder,
  slotsNoConflict,
  notBlank,
  nameValidator,
  medicalRegistrationValidator,
} from '../../../core/validators/app-validators';
import { PasswordInputComponent } from '../../../shared/ui/password-input/password-input';
import { AvailabilitySlotsFormComponent } from '../../../shared/ui/availability-slots-form/availability-slots-form';

const DRAFT_KEY = 'draft:self-register';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordInputComponent, AvailabilitySlotsFormComponent],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class RegisterComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly apiError = inject(ApiErrorHandlerService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly formDraft = inject(FormDraftService);

  registerForm: FormGroup;
  loading = false;
  submitted = false;

  attempted = false;

  designations: Designation[] = [...STAFF_DESIGNATIONS];
  departments = DEPARTMENTS;
  weekDays = WEEK_DAYS;

  showMedicalFields = false;
  showSpecialization = false;
  isDoctor = false;

  constructor() {
    this.registerForm = this.fb.group(
      {
        username: ['', Validators.required],
        name: ['', [Validators.required, notBlank, nameValidator]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, phoneValidator]],
        department: ['', Validators.required],
        designation: ['', Validators.required],
        joiningDate: ['', Validators.required],
        qualification: ['', Validators.required],
        medicalRegistrationNumber: [''],
        specialization: [''],
        consultationFee: [null, nonNegative],
        availabilitySlots: this.fb.array([], { validators: slotsNoConflict }),
        password: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator('password', 'confirmPassword') },
    );
  }

  ngOnInit(): void {

    const draft = this.formDraft.get(DRAFT_KEY);
    if (draft) {

      const slots = Array.isArray(draft['availabilitySlots'])
        ? draft['availabilitySlots']
        : [];
      slots.forEach(() => this.addSlot());
      this.registerForm.patchValue(draft);

      this.refreshDesignationsForDepartment(false);
      this.onDesignationChange();
    }

    this.registerForm.valueChanges.subscribe(() => {
      if (!this.submitted) {
        this.formDraft.save(DRAFT_KEY, this.registerForm.getRawValue());
      }
    });
  }

  get availabilitySlots(): FormArray {
    return this.registerForm.get('availabilitySlots') as FormArray;
  }

  addSlot(): void {
    this.availabilitySlots.push(
      this.fb.group(
        {
          day: ['MONDAY', Validators.required],
          startTime: ['09:00', Validators.required],
          endTime: ['17:00', Validators.required],
        },
        { validators: slotTimeOrder },
      ),
    );
  }

  removeSlot(index: number): void {
    this.availabilitySlots.removeAt(index);
  }

  onDepartmentChange(): void {
    this.refreshDesignationsForDepartment(true);
    this.onDesignationChange();
  }

  private refreshDesignationsForDepartment(autoFill: boolean): void {
    const dept = this.registerForm.get('department')?.value as Department | '';

    if (!dept) {
      this.designations = [...STAFF_DESIGNATIONS];
      return;
    }

    let allowed: Designation[] = [
      ...(DEPARTMENT_DESIGNATIONS[dept] || STAFF_DESIGNATIONS),
    ].filter((d) => d !== 'ADMIN');

    if (allowed.length === 0) {
      allowed = [...STAFF_DESIGNATIONS];
    }

    this.designations = allowed;

    if (autoFill) {
      const current = this.registerForm.get('designation')?.value as Designation;
      if (!current || !allowed.includes(current)) {
        this.registerForm.patchValue({ designation: allowed[0] });
      }
    }
  }

  onDesignationChange(): void {
    const designation = this.registerForm.get('designation')
      ?.value as Designation;

    this.isDoctor = designation === 'DOCTOR';
    this.showMedicalFields = MEDICAL_DESIGNATIONS.includes(designation);
    this.showSpecialization =
      SPECIALIZATION_DESIGNATIONS.includes(designation);

    const medReg = this.registerForm.get('medicalRegistrationNumber');
    const spec = this.registerForm.get('specialization');
    const fee = this.registerForm.get('consultationFee');

    medReg?.setValidators(
      this.showMedicalFields
        ? [Validators.required, medicalRegistrationValidator]
        : [],
    );
    spec?.setValidators(
      this.showSpecialization ? [Validators.required] : [],
    );
    fee?.setValidators(this.isDoctor ? [Validators.required] : []);

    if (this.isDoctor && this.availabilitySlots.length === 0) {
      this.addSlot();
    }
    if (!this.isDoctor) {
      this.availabilitySlots.clear();
    }

    medReg?.updateValueAndValidity();
    spec?.updateValueAndValidity();
    fee?.updateValueAndValidity();
  }

  hasUnsavedChanges(): boolean {
    return this.registerForm.dirty && !this.submitted;
  }

  onSubmit(): void {
    this.attempted = true;

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    this.loading = true;

    const raw = this.registerForm.getRawValue();

    const payload: any = {
      username: raw.username,
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      department: raw.department,
      designation: raw.designation,
      joiningDate: raw.joiningDate,
      qualification: this.toQualificationArray(raw.qualification),
      password: raw.password,
    };

    if (this.showMedicalFields && raw.medicalRegistrationNumber) {
      payload.medicalRegistrationNumber = raw.medicalRegistrationNumber;
    }
    if (this.showSpecialization && raw.specialization) {
      payload.specialization = raw.specialization;
    }
    if (this.isDoctor) {
      payload.consultationFee = Number(raw.consultationFee);
      payload.availabilitySlots = raw.availabilitySlots;
    }

    this.authService.selfRegister(payload).subscribe({
      next: (response) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.submitted = true;
        this.formDraft.clear(DRAFT_KEY);
        this.toast.success(
          response?.message || APP_MESSAGES.REGISTRATION_SUBMITTED,
        );
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (error) => {
        this.loading = false;
        this.cdr.markForCheck();
        this.toast.error(
          this.apiError.message(error, APP_MESSAGES.REGISTRATION_FAILED),
        );
      },
    });
  }

  private toQualificationArray(value: string | string[]): string[] {
    if (Array.isArray(value)) {
      return value;
    }
    return String(value || '')
      .split(',')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
  }
}