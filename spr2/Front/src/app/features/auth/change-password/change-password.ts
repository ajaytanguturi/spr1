import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  passwordComplexity,
  passwordMatchValidator,
  notSameAs,
} from '../../../core/validators/app-validators';
import { PasswordInputComponent } from '../../../shared/ui/password-input/password-input';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, PasswordInputComponent],
  templateUrl: './change-password.html',
  styleUrl: './change-password.css',
})
export class ChangePasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  changeForm: FormGroup;
  loading = false;
  forced = false;
  submitted = false;

  constructor() {
    this.changeForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: [
          passwordMatchValidator('newPassword', 'confirmPassword'),
          notSameAs('newPassword', 'currentPassword'),
        ],
      },
    );
  }

  ngOnInit(): void {
    this.forced = this.authService.isPasswordChangeRequired();
  }

  onSubmit(): void {
    this.submitted = true;

    if (this.changeForm.invalid) {
      this.changeForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { currentPassword, newPassword, confirmPassword } =
      this.changeForm.value;

    this.authService
      .changePassword(currentPassword, newPassword, confirmPassword)
      .subscribe({
        next: (response) => {
          this.toast.success(
            response?.message || 'Password changed successfully.',
          );
          this.authService.refreshCurrentUser().subscribe({
            next: () => {
              this.loading = false;
              this.cdr.markForCheck();
              this.router.navigate(['/dashboard/overview']);
            },
            error: () => {
              this.loading = false;
              this.cdr.markForCheck();
              this.router.navigate(['/dashboard/overview']);
            },
          });
        },
        error: (error) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.toast.error(
            error.error?.message ||
              'Failed to change password. Please try again.',
          );
        },
      });
  }

  onCancel(): void {
    if (this.forced) {
      return;
    }
    this.router.navigate(['/dashboard/overview']);
  }
}