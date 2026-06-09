import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';
import { FormDraftService } from '../../../core/services/form-draft.service';
import {
  phoneValidator,
  notBlank,
} from '../../../core/validators/app-validators';
import { CanComponentDeactivate } from '../../../core/guards/unsaved-changes.guard';
import { EmployeeProfile } from '../../../core/models/employee.model';

const DRAFT_KEY = 'draft:profile';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DashboardLayoutComponent,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class ProfileComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly employeeService = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly formDraft = inject(FormDraftService);
  private readonly router = inject(Router);

  profile = signal<EmployeeProfile | null>(null);
  loading = signal(true);
  saving = signal(false);
  submittedOk = false;
  isPrivileged = computed(() => this.authService.isSuperUser());

  profileForm: FormGroup;
  attempted = false;

  constructor() {
    this.profileForm = this.fb.group({
      phone: ['', [Validators.required, phoneValidator]],
      qualification: ['', [Validators.required, notBlank]],
    });
  }

  ngOnInit(): void {
    const cached = this.authService.getCurrentUser()?.profile;
    if (cached) {
      this.profile.set(cached);
      this.applyToForm(cached);
    }

    this.employeeService.getMe().subscribe({
      next: (res) => {
        this.profile.set(res.user.profile);
        this.applyToForm(res.user.profile);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        if (!cached) {
          this.toast.error('Failed to load profile.');
        }
      },
    });

    const draft = this.formDraft.get(DRAFT_KEY);
    if (draft) {
      this.profileForm.patchValue(draft);
    }
    this.profileForm.valueChanges.subscribe(() => {
      if (!this.submittedOk) {
        this.formDraft.save(DRAFT_KEY, this.profileForm.getRawValue());
      }
    });
  }

  private applyToForm(p: EmployeeProfile): void {

    if (this.profileForm.dirty) {
      return;
    }
    this.profileForm.patchValue({
      phone: p.phone ?? '',
      qualification: (p.qualification ?? []).join(', '),
    });
    this.profileForm.markAsPristine();
  }

  hasUnsavedChanges(): boolean {
    return this.profileForm.dirty && !this.submittedOk;
  }

  onSubmit(): void {
    this.attempted = true;
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      this.toast.warning('Please fix the highlighted fields.');
      return;
    }

    const raw = this.profileForm.getRawValue();
    const payload = {
      phone: raw.phone,
      qualification: String(raw.qualification)
        .split(',')
        .map((q: string) => q.trim())
        .filter((q: string) => q.length > 0),
    };

    this.saving.set(true);
    this.employeeService.profileUpdate(payload).subscribe({
      next: (res) => {
        this.saving.set(false);
        this.submittedOk = true;
        this.formDraft.clear(DRAFT_KEY);
        this.toast.success(
          res.message ||
          (this.isPrivileged()
            ? 'Profile updated successfully.'
            : 'Profile change request submitted for admin approval.'),
        );
        this.profileForm.markAsPristine();
        if (this.isPrivileged()) {
          this.employeeService.getMe().subscribe({
            next: (r) => this.profile.set(r.user.profile),
          });
          this.authService.refreshCurrentUser().subscribe({
            next: () => { },
            error: () => { },
          });
        }
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error(
          err.error?.message ||
          'Failed to submit profile change request.',
        );
      },
    });
  }

  goChangePassword(): void {
    this.router.navigate(['/change-password']);
  }
}