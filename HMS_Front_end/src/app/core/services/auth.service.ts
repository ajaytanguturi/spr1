import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ApiMessage } from '../models/api-response.model';
import {
  LoginResponse,
  MeResponse,
  User,
} from '../models/user.model';
import { Designation } from '../models/employee.model';
import { FormDraftService } from './form-draft.service';
import { NodeService } from './node.service';

const TOKEN_KEY = 'hms_token';
const USER_KEY = 'hms_user';

const SUPERUSER_DESIGNATIONS = new Set<Designation>([
  'OWNER',
  'ADMIN',
]);

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly formDraft = inject(FormDraftService);
  private readonly nodeService = inject(NodeService);

  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  currentUserSignal = signal<User | null>(null);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor() {
    this.loadUserFromStorage();
  }

  selfRegister(data: any): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/self-register`, data);
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/login`, { email, password })
      .pipe(
        tap((response) => {
          if (response?.data?.token && response?.data?.user) {
            this.setSession(response.data.token, response.data.user);
          }
        }),
      );
  }

  forgotPassword(email: string): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/forgot-password`, {
      email,
    });
  }

  resetPassword(
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<ApiMessage> {
    return this.http.post<ApiMessage>(`${this.apiUrl}/reset-password`, {
      resetToken,
      newPassword,
      confirmPassword,
    });
  }

  changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Observable<ApiMessage> {
    return this.http.put<ApiMessage>(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
  }

  refreshCurrentUser(): Observable<MeResponse> {
    return this.http.get<MeResponse>(`${this.apiUrl}/me`).pipe(
      tap((response) => {
        if (response?.data?.user) {
          this.persistUser(response.data.user);
        }
      }),
    );
  }

  logout(navigate = true): void {

    if (this.isPasswordChangeRequired()) {
      return;
    }

    this.http.post(`${this.apiUrl}/logout`, {}).subscribe({
      next: () => {},
      error: () => {},
    });
    this.clearSession();
    if (navigate) {
      this.router.navigate(['/login']);
    }
  }

  isPasswordChangeRequired(): boolean {
    return !!this.getCurrentUser()?.mustChangePassword;
  }

  forceClearSession(navigate = true): void {
    this.clearSession();
    if (navigate) {
      this.router.navigate(['/login']);
    }
  }

  private setSession(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    this.persistUser(user);
  }

  private persistUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.currentUserSignal.set(user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.formDraft.clearAll();
    this.nodeService.clearCache();
    this.currentUserSubject.next(null);
    this.currentUserSignal.set(null);
  }

  private loadUserFromStorage(): void {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) {
      return;
    }
    try {
      const user = JSON.parse(userStr) as User;
      this.currentUserSubject.next(user);
      this.currentUserSignal.set(user);
    } catch {
      this.clearSession();
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getDesignation(): Designation | null {
    return this.getCurrentUser()?.profile?.designation ?? null;
  }

  isSuperUser(): boolean {
    const designation = this.getDesignation();
    return !!designation && SUPERUSER_DESIGNATIONS.has(designation);
  }

  hasDesignation(allowed: Designation[]): boolean {
    const designation = this.getDesignation();
    if (!designation) {
      return false;
    }
    if (SUPERUSER_DESIGNATIONS.has(designation)) {
      return true;
    }
    return allowed.includes(designation);
  }
}
