import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, Subject } from 'rxjs';
import { DashboardLayoutComponent } from '../../../shared/ui/dashboard-layout/dashboard-layout';
import { PatientService } from '../../../core/services/patient.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  GENDERS,
  Patient,
  PATIENT_STATUSES,
} from '../../../core/models/patient.model';

@Component({
  selector: 'app-patients-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    DashboardLayoutComponent
  ],
  templateUrl: './patients-list.html',
  styleUrl: './patients-list.css',
})
export class PatientsListComponent implements OnInit {
  private readonly patientService = inject(PatientService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  patients = signal<Patient[]>([]);
  loading = signal(true);

  page = signal(1);
  limit = 10;
  total = signal(0);
  totalPages = signal(0);

  searchTerm = signal('');
  statusFilter = signal<string>('');
  genderFilter = signal<string>('');

  genders = GENDERS;
  statuses = PATIENT_STATUSES;

  searching = computed(() => this.searchTerm().trim().length > 0);

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.load();

    this.searchSubject.pipe(debounceTime(300)).subscribe((term) => {
      this.searchTerm.set(term);
      this.page.set(1);
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);

    if (this.searching()) {
      this.patientService.searchPatients(this.searchTerm()).subscribe({
        next: (res) => {
          this.patients.set(res.patients || []);
          this.total.set(res.total || 0);
          this.totalPages.set(1);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to search patients.');
        },
      });
      return;
    }

    this.patientService
      .getPatients(this.page(), this.limit, {
        status: this.statusFilter() || undefined,
        gender: this.genderFilter() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.patients.set(res.patients || []);
          this.total.set(res.total || 0);
          this.totalPages.set(res.totalPages || 1);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('Failed to load patients.');
        },
      });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
    this.load();
  }

  onGenderChange(value: string): void {
    this.genderFilter.set(value);
    this.page.set(1);
    this.load();
  }

  prevPage(): void {
    if (this.page() > 1) {
      this.page.update((p) => p - 1);
      this.load();
    }
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) {
      this.page.update((p) => p + 1);
      this.load();
    }
  }

  open(p: Patient): void {
    this.router.navigate(['/dashboard/patients', p.UHID]);
  }

  trackByUHID = (_: number, p: Patient) => p.UHID;
}
