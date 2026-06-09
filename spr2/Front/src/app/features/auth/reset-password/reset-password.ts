import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  passwordComplexity,
  passwordMatchValidator,
} from '../../../core/validators/app-validators';
import { PasswordInputComponent } from '../../../shared/ui/password-input/password-input';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordInputComponent],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  resetPasswordForm: FormGroup;
  loading = false;
  errorMessage = '';
  passwordReset = false;
  submitted = false;
  sameAsCurrent = false;
  token = '';

  constructor() {
    this.resetPasswordForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8), passwordComplexity]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatchValidator('newPassword', 'confirmPassword') },
    );

    this.resetPasswordForm.get('newPassword')?.valueChanges.subscribe(() => {
      this.sameAsCurrent = false;
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Invalid or missing reset link.';
    }
  }

  onSubmit(): void {
    this.submitted = true;
    this.sameAsCurrent = false;

    if (this.resetPasswordForm.invalid || !this.token) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { newPassword, confirmPassword } = this.resetPasswordForm.value;

    this.authService
      .resetPassword(this.token, newPassword, confirmPassword)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.cdr.markForCheck();
          this.passwordReset = true;
          this.toast.success(
            response?.message || 'Password reset successfully.',
          );
        },
        error: (error) => {
          this.loading = false;
          this.cdr.markForCheck();
          const msg = error.error?.message || '';
          if (/same as current/i.test(msg)) {
            this.sameAsCurrent = true;
            this.toast.error(msg);
            return;
          }

          this.errorMessage =
            msg || 'Failed to reset password. Link may be expired.';
          this.toast.error(this.errorMessage);
        },
      });
  }
}