
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';

@Component({
  selector: 'app-home-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home-navbar.html',
  styleUrls: ['./home-navbar.css']
})
export class HomeNavbarComponent implements OnInit {
  isAuthenticated = false;
  currentUser: any = null;
  showUserMenu = false;
  isMobileMenuOpen = false;
  profilePictureError = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}
  
  ngOnInit() {
    this.checkAuthStatus();
    
    // Listen for authentication changes
    this.authService.isAuthenticated$.subscribe(
      (isAuth) => {
        this.isAuthenticated = isAuth;
        if (isAuth) {
          this.currentUser = this.authService.getCurrentUser();
          this.profilePictureError = false; // Reset error when user changes
        } else {
          this.currentUser = null;
          this.profilePictureError = false;
        }
      }
    );
  }

  checkAuthStatus() {
    this.isAuthenticated = this.authService.isAuthenticated();
    if (this.isAuthenticated) {
      this.currentUser = this.authService.getCurrentUser();
      this.profilePictureError = false;
    }
  }

  onProfilePictureError(event: Event) {
    this.profilePictureError = true;
    console.warn('Profile picture failed to load, falling back to initials');
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.showUserMenu = !this.showUserMenu;
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
  
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  scrollToTop(): void {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    // Prevent body scrolling when mobile menu is open
    if (this.isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen = false;
    document.body.style.overflow = '';
  }
} 