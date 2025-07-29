import { Component, OnInit, HostListener, ViewChild } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { ToastService } from '../toast/toast.service';
import { NotificationModalComponent } from '../notification-modal/notification-modal';
import { SidebarService } from '../../../services/sidebar.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, CommonModule, NotificationModalComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent implements OnInit {
  isAuthenticated = false;
  currentUser: any = null;
  showUserMenu = false;
  unreadCount = 0;

  @ViewChild('notificationModal') notificationModal!: NotificationModalComponent;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
    private toastService: ToastService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit() {
    // Check authentication status on component init
    this.checkAuthStatus();
    
    // Listen for authentication changes
    this.authService.isAuthenticated$.subscribe(
      (isAuth) => {
        this.isAuthenticated = isAuth;
        if (isAuth) {
          this.currentUser = this.authService.getCurrentUser();
          // Load notifications when user is authenticated
          this.loadUserNotifications();
        } else {
          this.currentUser = null;
          // Clear notifications when user logs out
          this.notificationService.clearNotifications();
        }
      }
    );

    // Listen for notification updates
    this.notificationService.unreadCount$.subscribe(count => {
      this.unreadCount = count;
      console.log('🔔 Notification count updated:', count);
    });
  }

  private loadUserNotifications(): void {
    // Load notification summary when user logs in
    this.notificationService.loadNotificationSummary().subscribe({
      next: (summary) => {
        console.log('📧 Loaded notification summary:', summary);
        this.unreadCount = summary.unreadCount;
        console.log('🔔 Updated unread count to:', this.unreadCount);
      },
      error: (error) => {
        console.error('❌ Error loading notifications:', error);
        // Don't show error toast for network issues to avoid spam
        if (error.status !== 0) {
          console.warn('⚠️ Failed to load notifications, but continuing...');
        }
      }
    });
  }

  checkAuthStatus() {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.currentUser = this.authService.getCurrentUser();
    }
  }

  openNotificationModal() {
    if (this.notificationModal) {
      // Refresh notifications before opening modal
      this.notificationService.refreshNotifications();
      this.notificationModal.openModal();
    }
  }



  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
  }

  navigateToProfile() {
    this.showUserMenu = false;
    this.router.navigate(['/profile']);
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.toastService.showSuccess('Logged out successfully');
        this.showUserMenu = false;
        this.router.navigate(['/']);
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.toastService.showError('Error during logout');
      }
    });
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return 'U';
    return this.currentUser.name
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getUserRole(): string {
    if (!this.currentUser?.role) return '';
    return this.currentUser.role.charAt(0) + this.currentUser.role.slice(1).toLowerCase();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close dropdown if clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu-container')) {
      this.showUserMenu = false;
    }
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    const nextElement = target.nextElementSibling as HTMLElement;
    if (nextElement) {
      nextElement.style.display = 'flex';
    }
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }
}
