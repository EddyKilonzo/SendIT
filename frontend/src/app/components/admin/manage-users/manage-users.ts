import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ToastService } from '../../shared/toast/toast.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { catchError, of } from 'rxjs';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
  deletedAt?: string;
  profilePicture?: string;
  // Driver-specific fields
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  isAvailable?: boolean;
  averageRating?: number;
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeDeliveryRate?: number;
  totalEarnings?: number;
  // Driver application fields
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: string;
  driverApprovalDate?: string;
  driverRejectionReason?: string;
}

interface DriverApplication {
  id: string;
  name: string;
  email: string;
  phone?: string;
  driverApplicationStatus: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: string;
  driverApprovalDate?: string;
  driverRejectionReason?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.html',
  styleUrl: './manage-users.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent]
})
export class ManageUsers implements OnInit {
  constructor(
    private router: Router,
    private toastService: ToastService,
    private adminService: AdminService,
    private authService: AuthService
  ) {}
  
  // User role for role-based access control
  userRole: string = '';
  
  // Tab management
  activeTab = 'users';
  
  // Loading states
  isLoadingUsers = true;
  isLoadingApplications = true;
  
  // User management
  searchTerm = '';
  selectedStatus = '';
  selectedRole = '';
  
  // Driver applications
  selectedApplicationStatus = '';
  currentApplicationPage = 1;
  applicationsPerPage = 6;
  showRejectionModal = false;
  selectedApplicationForRejection: DriverApplication | null = null;
  rejectionReason = '';
  showApplicationDetailsModal = false;
  selectedApplicationForReview: DriverApplication | null = null;
  
  // Users data
  users: User[] = [];
  totalUsers = 0;
  currentPage = 1;
  usersPerPage = 8;
  
  // Driver applications data
  driverApplications: DriverApplication[] = [];
  totalApplications = 0;

  ngOnInit(): void {
    // Get the actual user role from authentication service
    const currentUser = this.authService.getCurrentUser();
    this.userRole = currentUser?.role || '';
    
    // Check if user is admin
    if (this.userRole !== 'ADMIN') {
      this.toastService.showError('Access denied. Admin privileges required.');
      return;
    }
    
    this.loadUsers();
    this.loadDriverApplications();
  }

  // Test method to verify API connection
  testApiConnection() {
    console.log('Testing API connection...');
    this.adminService.getUsers(1, 5)
      .subscribe({
        next: (response) => {
          console.log('✅ API connection successful:', response);
          console.log('✅ Response details:');
          console.log('  - Users array:', response.users);
          console.log('  - Users count:', response.users?.length || 0);
          console.log('  - Total count:', response.total);
          console.log('  - Full response object:', response);
        },
        error: (error) => {
          console.error('❌ API connection failed:', error);
          console.error('❌ Error details:', error.error);
          this.toastService.showError('API connection failed. Please check your backend server.');
        }
      });
  }

  // Debug authentication method
  debugAuth() {
    const currentUser = this.authService.getCurrentUser();
    const isAuthenticated = this.authService.isAuthenticated();
    const token = this.authService.getToken();
    
    console.log('🔍 Debug Authentication:');
    console.log('Current user:', currentUser);
    console.log('Is authenticated:', isAuthenticated);
    console.log('Token exists:', !!token);
    console.log('Token (first 50 chars):', token ? token.substring(0, 50) + '...' : 'No token');
    console.log('User role:', currentUser?.role);
    console.log('Component userRole:', this.userRole);
    
    // Show alert with auth info
    const authInfo = `
Authentication Debug Info:
- Is Authenticated: ${isAuthenticated}
- User Role: ${currentUser?.role || 'None'}
- Component Role: ${this.userRole}
- Token: ${token ? 'Present' : 'Missing'}
- User Email: ${currentUser?.email || 'None'}
    `;
    
    alert(authInfo);
  }

  loadUsers() {
    this.isLoadingUsers = true;
    
    const query: any = {};
    if (this.searchTerm) query.search = this.searchTerm;
    if (this.selectedStatus && this.selectedStatus !== '') {
      if (this.selectedStatus === 'Suspended') {
        query.showSuspended = true;
      } else {
        query.isActive = this.selectedStatus === 'Active';
      }
    }
    if (this.selectedRole) query.role = this.selectedRole;
    
    this.adminService.getUsers(this.currentPage, this.usersPerPage, query)
      .pipe(
        catchError(error => {
          console.error('Error loading users:', error);
          this.toastService.showError('Failed to load users. Please try again.');
          return of({ users: [], total: 0 });
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Debug - Users API response:', response);
          this.users = response.users || [];
          this.totalUsers = response.total || 0;
          this.isLoadingUsers = false;
          console.log('✅ Debug - Loaded users:', this.users.length, 'Total:', this.totalUsers);
          console.log('✅ Debug - Users data:', this.users);
        },
        error: (error) => {
          console.error('❌ Debug - Error loading users:', error);
          console.error('❌ Debug - Error details:', error.error);
          this.toastService.showError('Failed to load users. Please try again.');
          this.isLoadingUsers = false;
        }
      });
  }

  loadDriverApplications() {
    this.isLoadingApplications = true;
    
    const query: any = {};
    if (this.selectedApplicationStatus) query.status = this.selectedApplicationStatus; // Changed from driverApplicationStatus to status
    

    
    this.adminService.getDriverApplications(this.currentApplicationPage, this.applicationsPerPage, query)
      .pipe(
        catchError(error => {
          console.error('Error loading driver applications:', error);
          this.toastService.showError('Failed to load driver applications. Please try again.');
          return of({ applications: [], total: 0 });
        })
      )
      .subscribe({
        next: (response) => {
          this.driverApplications = response.applications || [];
          this.totalApplications = response.total || 0;
          this.isLoadingApplications = false;
        },
        error: (error) => {
          console.error('Error loading driver applications:', error);
          this.toastService.showError('Failed to load driver applications. Please try again.');
          this.isLoadingApplications = false;
        }
      });
  }

  get filteredUsers(): User[] {
    // Since we're doing server-side filtering, just return the users as they come from the API
    return this.users;
  }

  get paginatedUsers(): User[] {
    // Since we're doing server-side pagination, just return the users as they come from the API
    return this.users;
  }

  get totalPages(): number {
    return Math.ceil(this.totalUsers / this.usersPerPage);
  }

  setPage(page: number) {
    this.currentPage = page;
    this.loadUsers();
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedRole = '';
    this.currentPage = 1;
    this.loadUsers();
  }

  // Add method to handle search input changes
  onSearchChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  // Add method to handle status filter changes
  onStatusChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  // Add method to handle role filter changes
  onRoleChange() {
    this.currentPage = 1;
    this.loadUsers();
  }

  // Add method to handle application status filter changes
  onApplicationStatusChange() {
    this.currentApplicationPage = 1;
    this.loadDriverApplications();
  }

  viewUserDetails(userId: string) {
    console.log('Navigating to user details:', userId);
    console.log('Current route:', this.router.url);
    console.log('User ID type:', typeof userId);
    console.log('User ID value:', userId);
    
    if (!userId) {
      console.error('User ID is empty or undefined');
      this.toastService.showError('Invalid user ID');
      return;
    }
    
    this.router.navigate(['/admin', 'user-details', userId])
      .then(() => {
        console.log('Navigation successful');
      })
      .catch((error) => {
        console.error('Navigation failed:', error);
        this.toastService.showError('Failed to navigate to user details');
      });
  }

  // Tab Management
  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'applications' && this.driverApplications.length === 0) {
      this.loadDriverApplications();
    }
  }

  // Driver Applications Methods
  get filteredApplications(): DriverApplication[] {
    let filtered = this.driverApplications;
    if (this.selectedApplicationStatus) {
      filtered = filtered.filter(app => app.driverApplicationStatus === this.selectedApplicationStatus);
    }
    return filtered;
  }

  get paginatedApplications(): DriverApplication[] {
    const startIndex = (this.currentApplicationPage - 1) * this.applicationsPerPage;
    const endIndex = startIndex + this.applicationsPerPage;
    return this.filteredApplications.slice(startIndex, endIndex);
  }

  get totalApplicationPages(): number {
    return Math.ceil(this.filteredApplications.length / this.applicationsPerPage);
  }

  setApplicationPage(page: number) {
    this.currentApplicationPage = page;
    this.loadDriverApplications();
  }

  clearApplicationFilters() {
    this.selectedApplicationStatus = '';
    this.currentApplicationPage = 1;
    this.loadDriverApplications();
  }

  // Helper method to get user initials
  getUserInitials(name: string): string {
    if (!name) return '?';
    
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    } else {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
  }

  // Helper method to get avatar color based on name
  getAvatarColor(name: string): string {
    const colors = [
      '#DBBB02', '#f0c800', '#FFD700', '#FFA500', '#FF8C00',
      '#FF7F50', '#FF6347', '#FF4500', '#FFD700', '#FFA500',
      '#FF8C00', '#FF7F50', '#FF6347', '#FF4500', '#FFD700'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  // Helper method to get role icon
  getRoleIcon(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'fa-shield-alt';
      case 'DRIVER':
        return 'fa-truck';
      case 'CUSTOMER':
        return 'fa-user';
      default:
        return 'fa-user';
    }
  }



  // Handle image loading errors
  onImageError(event: any): void {
    // Hide the broken image and show initials instead
    event.target.style.display = 'none';
    const avatarContainer = event.target.parentElement;
    const initialsDiv = avatarContainer.querySelector('.avatar-initials');
    if (initialsDiv) {
      initialsDiv.style.display = 'flex';
    }
  }

  // Application Statistics
  get pendingApplicationsCount(): number {
    return this.driverApplications.filter(app => app.driverApplicationStatus === 'PENDING').length;
  }

  get approvedApplicationsCount(): number {
    return this.driverApplications.filter(app => app.driverApplicationStatus === 'APPROVED').length;
  }

  get rejectedApplicationsCount(): number {
    return this.driverApplications.filter(app => app.driverApplicationStatus === 'REJECTED').length;
  }

  // Status Methods
  getStatusClass(status: string): string {
    switch (status) {
      case 'NOT_APPLIED':
        return 'status-not-applied';
      case 'PENDING':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'NOT_APPLIED':
        return 'Not Applied';
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  // Application Actions
  viewApplicationDetails(applicationId: string) {
    const application = this.driverApplications.find(app => app.id === applicationId);
    if (application) {
      this.selectedApplicationForReview = application;
      this.showApplicationDetailsModal = true;
    }
  }

  approveApplication(applicationId: string, event: Event) {
    event.stopPropagation();
    const application = this.driverApplications.find(app => app.id === applicationId);
    if (application) {
      this.adminService.approveDriverApplication(applicationId)
        .pipe(
          catchError(error => {
            this.toastService.showError('Failed to approve application.');
            console.error(error);
            return of(null);
          })
        )
        .subscribe(() => {
          this.toastService.showSuccess(`Application from ${application.name} has been approved successfully!`);
          this.loadDriverApplications();
        });
    }
  }

  rejectApplication(applicationId: string, event: Event) {
    event.stopPropagation();
    const application = this.driverApplications.find(app => app.id === applicationId);
    if (application) {
      this.selectedApplicationForRejection = application;
      this.rejectionReason = '';
      this.showRejectionModal = true;
    }
  }

  confirmRejection() {
    if (!this.selectedApplicationForRejection || !this.rejectionReason.trim()) {
      this.toastService.showError('Please provide a reason for rejection');
      return;
    }

    this.adminService.rejectDriverApplication(this.selectedApplicationForRejection!.id, this.rejectionReason)
      .pipe(
        catchError(error => {
          this.toastService.showError('Failed to reject application.');
          console.error(error);
          return of(null);
        })
      )
      .subscribe(() => {
        this.toastService.showSuccess(`Application from ${this.selectedApplicationForRejection!.name} has been rejected.`);
        this.loadDriverApplications();
      this.closeRejectionModal();
      });
  }

  closeRejectionModal() {
    this.showRejectionModal = false;
    this.selectedApplicationForRejection = null;
    this.rejectionReason = '';
  }

  // Application Details Modal Methods
  closeApplicationDetailsModal() {
    this.showApplicationDetailsModal = false;
    this.selectedApplicationForReview = null;
  }

  approveApplicationFromModal() {
    if (!this.selectedApplicationForReview) return;
    
    this.adminService.approveDriverApplication(this.selectedApplicationForReview!.id)
      .pipe(
        catchError(error => {
          this.toastService.showError('Failed to approve application from modal.');
          console.error(error);
          return of(null);
        })
      )
      .subscribe(() => {
        this.toastService.showSuccess(`Application from ${this.selectedApplicationForReview!.name} has been approved successfully!`);
      this.closeApplicationDetailsModal();
        this.loadDriverApplications();
      });
  }

  rejectApplicationFromModal() {
    if (!this.selectedApplicationForReview) return;
    
    this.selectedApplicationForRejection = this.selectedApplicationForReview;
    this.rejectionReason = '';
    this.showRejectionModal = true;
    this.closeApplicationDetailsModal();
  }

  // Helper method to get status text and icon
  getStatusInfo(user: any): { text: string; icon: string; class: string } {
    console.log('Getting status info for user:', user.name, 'isActive:', user.isActive, 'deletedAt:', user.deletedAt);
    if (user.deletedAt) {
      return { text: 'Suspended', icon: 'fa-exclamation-triangle', class: 'suspended' };
    } else if (user.isActive) {
      return { text: 'Active', icon: 'fa-check-circle', class: 'active' };
    } else {
      return { text: 'Inactive', icon: 'fa-times-circle', class: 'inactive' };
    }
  }
}
