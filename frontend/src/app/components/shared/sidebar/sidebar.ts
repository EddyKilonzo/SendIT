import {
  Component,
  OnInit,
  Input,
  AfterViewInit,
  ViewChildren,
  QueryList,
  ElementRef,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  Router,
  NavigationEnd,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService, User } from '../../../services/auth.service';
import { filter } from 'rxjs/operators';

export interface NavigationItem {
  icon: string;
  label: string;
  route: string;
  roles: ('ADMIN' | 'CUSTOMER' | 'DRIVER')[];
  isActive?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class SidebarComponent implements OnInit, AfterViewInit {
  @Input() currentPage: string = '';
  @ViewChildren('navItem') navItems!: QueryList<ElementRef>;

  currentUser: User | null = null;
  userRole: string = '';

  // Navigation items based on roles, unified icons for consistency
  navigationItems: NavigationItem[] = [
    // Common items for all roles
    {
      icon: 'fas fa-tachometer-alt', // dashboard icon
      label: 'Dashboard',
      route: '',
      roles: ['ADMIN', 'CUSTOMER', 'DRIVER'],
    },
    // Admin-specific items
    {
      icon: 'fas fa-truck-loading', // delivery icon
      label: 'Create Delivery',
      route: '/admin/create-delivery',
      roles: ['ADMIN'],
    },
    {
      icon: 'fas fa-box', // parcel icon
      label: 'Manage Parcels',
      route: '/admin/manage-parcels',
      roles: ['ADMIN'],
    },
    {
      icon: 'fas fa-users', // users icon
      label: 'Manage Users',
      route: '/admin/manage-users',
      roles: ['ADMIN'],
    },
    // Customer-specific items
    {
      icon: 'fas fa-box', // parcel icon
      label: 'My Parcels',
      route: '/user/parcels',
      roles: ['CUSTOMER'],
    },
    // Driver-specific items
    {
      icon: 'fas fa-box', // parcel icon
      label: 'My Parcels',
      route: '/driver/my-parcels',
      roles: ['DRIVER'],
    },
    {
      icon: 'fas fa-history', // history icon
      label: 'Delivery History',
      route: '/driver/history',
      roles: ['DRIVER'],
    },
    // Common profile for all
    {
      icon: 'fas fa-user', // profile icon, not circle
      label: 'Profile',
      route: '/profile',
      roles: ['ADMIN', 'CUSTOMER', 'DRIVER'],
    },
  ];

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    // Get current user and role
    this.currentUser = this.authService.getCurrentUser();
    this.userRole = this.currentUser?.role || '';

    // Set dashboard route based on role
    this.setDashboardRoute();
    // Subscribe to router events to auto-scroll active navlink on navigation
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          const activeIndex = this.getVisibleNavItems().findIndex((item) =>
            this.isRouteActive(item.route)
          );
          if (activeIndex !== -1 && this.navItems) {
            const el = this.navItems.toArray()[activeIndex]?.nativeElement;
            if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        }, 100);
      });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const activeIndex = this.getVisibleNavItems().findIndex((item) =>
        this.isRouteActive(item.route)
      );
      if (activeIndex !== -1 && this.navItems) {
        const el = this.navItems.toArray()[activeIndex]?.nativeElement;
        if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 100);
  }

  private setDashboardRoute() {
    const dashboardItem = this.navigationItems.find(
      (item) => item.label === 'Dashboard'
    );
    if (dashboardItem) {
      switch (this.userRole) {
        case 'ADMIN':
          dashboardItem.route = '/admin/dashboard';
          break;
        case 'CUSTOMER':
          dashboardItem.route = '/user/dashboard';
          break;
        case 'DRIVER':
          dashboardItem.route = '/driver/dashboard';
          break;
        default:
          dashboardItem.route = '/';
      }
    }
  }

  // Filter navigation items based on user role
  getVisibleNavItems(): NavigationItem[] {
    return this.navigationItems.filter((item) =>
      item.roles.includes(this.userRole as any)
    );
  }

  // Check if a route is currently active
  isRouteActive(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'subset',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }
}
