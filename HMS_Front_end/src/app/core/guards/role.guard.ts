import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Designation } from '../models/employee.model';

export const designationGuard = (
  allowed: Designation[],
): CanActivateFn => {
  return (_route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (authService.hasDesignation(allowed)) {
      return true;
    }
    return router.createUrlTree(['/dashboard/overview']);
  };
};

export const roleGuard = designationGuard;
