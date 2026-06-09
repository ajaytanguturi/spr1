import { Routes, CanActivateFn, Router } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { designationGuard } from './core/guards/role.guard';
import { mustChangePasswordGuard } from './core/guards/must-change-password.guard';
import { unsavedChangesGuard } from './core/guards/unsaved-changes.guard';

export const routes: Routes = [

  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then((m) => m.HomeComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password/change-password').then(
        (m) => m.ChangePasswordComponent,
      ),
  },

  {
    path: 'dashboard',
    canActivate: [authGuard, mustChangePasswordGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/dashboard/overview/overview').then(
            (m) => m.OverviewComponent,
          ),
      },
      {
        path: 'profile',
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/dashboard/profile/profile').then(
            (m) => m.ProfileComponent,
          ),
      },

      {
        path: 'employees',
        canActivate: [designationGuard([])], 
        loadComponent: () =>
          import('./features/dashboard/employees/employees').then(
            (m) => m.EmployeesListComponent,
          ),
      },
      {
        path: 'employees/create',
        canActivate: [designationGuard([])],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'staff' },
        loadComponent: () =>
          import(
            './features/dashboard/employees-create/employees-create'
          ).then((m) => m.CreateEmployeeComponent),
      },
      {
        path: 'employees/:code/edit',
        canActivate: [designationGuard([])],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'edit' },
        loadComponent: () =>
          import(
            './features/dashboard/employees-create/employees-create'
          ).then((m) => m.CreateEmployeeComponent),
      },

      {
        path: 'approvals',
        canActivate: [designationGuard([])],
        loadComponent: () =>
          import('./features/dashboard/approvals/approvals').then(
            (m) => m.ApprovalsComponent,
          ),
      },
      {
        path: 'admins',
        canActivate: [ownerOnlyGuard()],
        loadComponent: () =>
          import('./features/dashboard/admins/admins').then(
            (m) => m.AdminsComponent,
          ),
      },
      {
        path: 'admins/create',
        canActivate: [ownerOnlyGuard()],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'admin' },
        loadComponent: () =>
          import(
            './features/dashboard/employees-create/employees-create'
          ).then((m) => m.CreateEmployeeComponent),
      },
      {
        path: 'patients',
        canActivate: [designationGuard(['RECEPTIONIST'])],
        loadComponent: () =>
          import('./features/dashboard/patients-list/patients-list').then(
            (m) => m.PatientsListComponent,
          ),
      },
      {
        path: 'patients/create',
        canActivate: [designationGuard(['RECEPTIONIST'])],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/dashboard/patient-create/patient-create').then(
            (m) => m.PatientCreateComponent,
          ),
      },
      {
        path: 'patients/:UHID',
        canActivate: [designationGuard(['RECEPTIONIST'])],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import('./features/dashboard/patient-detail/patient-detail').then(
            (m) => m.PatientDetailComponent,
          ),
      },
      {
        path: 'appointments',
        canActivate: [designationGuard(['RECEPTIONIST', 'DOCTOR'])],
        loadComponent: () =>
          import(
            './features/dashboard/appointments-list/appointments-list'
          ).then((m) => m.AppointmentsListComponent),
      },
      {
        path: 'appointments/book',
        canActivate: [designationGuard(['RECEPTIONIST'])],
        canDeactivate: [unsavedChangesGuard],
        loadComponent: () =>
          import(
            './features/dashboard/appointment-book/appointment-book'
          ).then((m) => m.AppointmentBookComponent),
      },
      {
        path: 'appointments/:appointmentId/edit',
        canActivate: [designationGuard(['RECEPTIONIST'])],
        canDeactivate: [unsavedChangesGuard],
        data: { mode: 'edit' },
        loadComponent: () =>
          import(
            './features/dashboard/appointment-book/appointment-book'
          ).then((m) => m.AppointmentBookComponent),
      },
      {
        path: 'appointments/:appointmentId',
        canActivate: [designationGuard(['RECEPTIONIST', 'DOCTOR'])],
        loadComponent: () =>
          import(
            './features/dashboard/appointment-detail/appointment-detail'
          ).then((m) => m.AppointmentDetailComponent),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];

import { inject } from '@angular/core';
import { AuthService } from './core/services/auth.service';

function ownerOnlyGuard(): CanActivateFn {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url },
      });
    }

    if (authService.getDesignation() === 'OWNER') {
      return true;
    }

    return router.createUrlTree(['/dashboard/overview']);
  };
}
