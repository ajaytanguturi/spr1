import {
  Component,
  HostListener,
  OnInit,
  signal,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar';

const MOBILE_BREAKPOINT = 768;

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, SidebarComponent],
  templateUrl: './dashboard-layout.html',
  styleUrl: './dashboard-layout.css',
})
export class DashboardLayoutComponent implements OnInit {
  @Input() pageTitle = '';
  isMobile = signal(false);
  sidebarOpen = signal(true);

  ngOnInit(): void {
    this.applyViewport();
  }
  @HostListener('window:resize')
  onResize(): void {
    this.applyViewport();
  }

  private applyViewport(): void {
    const mobile = globalThis.window !== undefined && window.innerWidth < MOBILE_BREAKPOINT;
    this.isMobile.set(mobile);
    this.sidebarOpen.set(!mobile);
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }
  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  onSidebarNavigate(): void {
    if (this.isMobile()) {
      this.closeSidebar();
    }
  }
}