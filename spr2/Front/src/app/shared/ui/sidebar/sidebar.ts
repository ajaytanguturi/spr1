import {
  Component,
  computed,
  EventEmitter,
  inject,
  Output,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { NodeService } from '../../../core/services/node.service';
import { SidebarNode } from '../../../core/models/node.model';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly nodeService = inject(NodeService);

  @Output() navigate = new EventEmitter<void>();
  @Output() sidebarToggled = new EventEmitter<void>();

  title = 'HMS';
  subtitle = 'Hospital Management';

  private readonly defaultNodes: SidebarNode[] = [
    {
      nodeId: 'default-overview',
      name: 'Overview',
      path: '/dashboard/overview',
      icon: 'overview',
      allowedDesignations: [],
    },
    {
      nodeId: 'default-profile',
      name: 'Profile',
      path: '/dashboard/profile',
      icon: 'profile',
      allowedDesignations: [],
    },
  ];

  private readonly backendNodes = signal<SidebarNode[]>([]);

  menuItems = computed<SidebarNode[]>(() => {
    const seen = new Set<string>();
    const combined: SidebarNode[] = [];

    for (const node of [...this.defaultNodes, ...this.backendNodes()]) {
      const key = node.path.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      combined.push(node);
    }
    return combined;
  });

  userMenuOpen = signal(false);

  get currentUser() {
    return this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.nodeService.getMyNodes().subscribe({
      next: (res) => {
        const defaultPaths = new Set(
          this.defaultNodes.map((n) => n.path.toLowerCase()),
        );
        const filtered = (res.nodes || []).filter(
          (n) => !defaultPaths.has(n.path.toLowerCase()),
        );
        this.backendNodes.set(filtered);
      },
      error: () => {
        this.backendNodes.set([]);
      },
    });
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((v) => !v);
  }

  onToggle(): void {
    this.sidebarToggled.emit();
  }
  onNavigate(): void {
    this.navigate.emit();
  }

  closeUserMenu(): void {
    this.userMenuOpen.set(false);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }

  getUserInitial(): string {
    const name = this.currentUser?.profile?.name || this.currentUser?.username;
    return name?.charAt(0)?.toUpperCase() || 'U';
  }

  getDisplayName(): string {
    return (
      this.currentUser?.profile?.name || this.currentUser?.username || 'User'
    );
  }

  getDesignation(): string {
    return this.currentUser?.profile?.designation || '';
  }

  private readonly iconCache = new Map<string, string>();

  private readonly icons: Record<string, string> = {
    overview:
      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    profile:
      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:
      '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    'user-plus':
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>',
    'check-circle':
      '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    shield:
      '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    calendar:
      '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'calendar-plus':
      '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>',
  };

  private readonly fallbackIcon =
    '<circle cx="12" cy="12" r="9"/>';

  iconFor(node: SidebarNode): string {
    const key = (node.icon || '').toLowerCase();

    const cached = this.iconCache.get(key);
    if (cached) {
      return cached;
    }

    const inner = this.icons[key] || this.fallbackIcon;

    const svg =
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
      `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">` +
      `${inner}</svg>`;

    this.iconCache.set(key, svg);
    return svg;
  }
}