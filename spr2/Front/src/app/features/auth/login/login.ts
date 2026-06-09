import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { PasswordInputComponent } from '../../../shared/ui/password-input/password-input';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, PasswordInputComponent],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);

  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (response) => {
        this.loading = false;
        this.cdr.markForCheck();
        if (response?.token && response?.user) {
          this.toast.success(
            `Welcome back, ${response.user.profile?.name || response.user.username}!`,
          );

          if (response.user.mustChangePassword) {
            this.router.navigate(['/change-password']);
            return;
          }

          const returnUrl =
            this.route.snapshot.queryParamMap.get('returnUrl') ||
            '/dashboard/overview';
          this.router.navigateByUrl(returnUrl);
        }
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'Login failed. Please try again.';
        this.toast.error(this.errorMessage);
        this.cdr.markForCheck();
      },
    });
  }
}