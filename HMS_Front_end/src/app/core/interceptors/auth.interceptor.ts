import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { APP_MESSAGES } from '../constants/messages';

const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/self-register',
];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const toastService = inject(ToastService);
  const router = inject(Router);

  const token = authService.getToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  const isPublicAuthCall = PUBLIC_AUTH_PATHS.some((p) => req.url.includes(p));

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:

          if (!isPublicAuthCall) {
            toastService.error(APP_MESSAGES.SESSION_EXPIRED);
            authService.forceClearSession();
          }
          break;

        case 403:
          toastService.error(APP_MESSAGES.ACCESS_DENIED);
          router.navigate(['/dashboard/overview']);
          break;

        case 0:
          toastService.error(APP_MESSAGES.NETWORK_ERROR);
          break;
      }

      return throwError(() => error);
    }),
  );
};
