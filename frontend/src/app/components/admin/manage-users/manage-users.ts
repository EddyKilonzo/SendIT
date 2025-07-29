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
  driverApplicationReason?: string;
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
  driverApplicationReason?: string;
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
  isActionInProgress = false; // Flag to prevent modal opening during actions
  
  // Loading states for specific actions
  approvingApplicationId: string | null = null;
  rejectingApplicationId: string | null = null;
  isConfirmingRejection = false;
  
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
    
    // Show toast with auth info
    const authInfo = `Authentication Debug Info: Is Authenticated: ${isAuthenticated}, User Role: ${currentUser?.role || 'None'}, Component Role: ${this.userRole}, Token: ${token ? 'Present' : 'Missing'}, User Email: ${currentUser?.email || 'None'}`;
    
    this.toastService.showInfo(authInfo);
  }

  loadUsers() {
    this.isLoadingUsers = true;
    
    const query: any = {};
    if (this.searchTerm) query.search = this.searchTerm;
    if (this.selectedStatus && this.selectedStatus !== '') {
      if (this.selectedStatus === 'Suspended') {
        // For suspended users, we want to show them but filter by isActive = false
        query.isActive = false;
      } else if (this.selectedStatus === 'Active') {
        query.isActive = true;
      } else if (this.selectedStatus === 'Inactive') {
        query.isActive = false;
      }
      // If no status is selected, don't filter by isActive (shows all users)
    }
    if (this.selectedRole) query.role = this.selectedRole;
    
    console.log('🔍 Debug - loadUsers called with query:', query);
    console.log('🔍 Debug - selectedStatus:', this.selectedStatus);
    console.log('🔍 Debug - searchTerm:', this.searchTerm);
    console.log('🔍 Debug - selectedRole:', this.selectedRole);
    
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
          console.log('✅ Debug - Response users array:', response.users);
          console.log('✅ Debug - Users with isActive=false:', response.users?.filter(u => !u.isActive));
          console.log('✅ Debug - Users with isActive=true:', response.users?.filter(u => u.isActive));
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
    if (this.selectedApplicationStatus) query.status = this.selectedApplicationStatus;
    
    console.log('🔍 Loading driver applications with query:', query);
    
    this.adminService.getDriverApplications(this.currentApplicationPage, this.applicationsPerPage, query)
      .pipe(
        catchError(error => {
          console.error('❌ Error loading driver applications:', error);
          this.toastService.showError('Failed to load driver applications. Please try again.');
          return of({ applications: [], total: 0 });
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Driver applications loaded:', response);
          this.driverApplications = response.applications || [];
          this.totalApplications = response.total || 0;
          this.isLoadingApplications = false;
        },
        error: (error) => {
          console.error('❌ Error loading driver applications:', error);
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
    console.log('🔍 Viewing user details for ID:', userId);
    
    if (!userId) {
      console.error('User ID is empty or undefined');
      this.toastService.showError('Invalid user ID');
      return;
    }
    
    // Find the user in the current list
    const user = this.users.find(u => u.id === userId);
    if (!user) {
      console.error('❌ User not found in current list');
      this.toastService.showError('User not found');
      return;
    }
    
    console.log('✅ Found user:', user);
    
    // Load additional user data before navigation
    this.loadUserDetails(userId, user);
    
    // Scroll to top after navigation
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }, 100);
  }

  private loadUserDetails(userId: string, user: User) {
    console.log('🔄 loadUserDetails called for user:', user);
    
    // Skip getUserStats since it doesn't exist in backend
    // If user is a driver, load driver-specific data
    if (user.role === 'DRIVER') {
      this.loadDriverDetails(userId, user, null);
    } else {
      // Navigate with user data
      this.router.navigate(['/admin', 'user-details', userId], {
        state: { 
          userData: user
        }
      });
    }
  }

  private loadDriverDetails(driverId: string, driver: User, userStats: any) {
    console.log('🔄 loadDriverDetails called for driver:', driver);
    
    // Load driver parcels and statistics using the comprehensive endpoint
    this.adminService.getDriverComprehensiveData(driverId).subscribe({
      next: (driverData) => {
        console.log('✅ Driver comprehensive data loaded:', driverData);
        
        // Navigate with complete driver data
        this.router.navigate(['/admin', 'user-details', driverId], {
          state: { 
            userData: driver,
            userStats: userStats || {},
            driverParcels: driverData.parcels || [],
            driverStats: driverData.stats || {}
          }
        });
      },
      error: (error) => {
        console.error('❌ Error loading driver comprehensive data:', error);
        // Navigate with user data if driver data fails
        this.router.navigate(['/admin', 'user-details', driverId], {
          state: { 
            userData: driver,
            userStats: userStats || {}
          }
        });
      }
    });
  }

  // Tab Management
  switchTab(tab: string) {
    this.activeTab = tab;
    
    // Scroll to top when switching tabs for better UX
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }, 100);
    
    if (tab === 'users') {
      this.loadUsers();
    } else if (tab === 'applications') {
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
    // Don't open modal if an action is in progress
    if (this.isActionInProgress) {
      return;
    }
    const application = this.driverApplications.find(app => app.id === applicationId);
    if (application) {
      this.selectedApplicationForReview = application;
      this.showApplicationDetailsModal = true;
    }
  }

  approveApplication(applicationId: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.approvingApplicationId = applicationId;
    this.isActionInProgress = true;
    const application = this.driverApplications.find(app => app.id === applicationId);
    if (application) {
      console.log('🔍 Approving application for:', application.name, 'ID:', applicationId);
      console.log('🔍 Current application status:', application.driverApplicationStatus);
      
      this.adminService.approveDriverApplication(applicationId)
        .pipe(
          catchError(error => {
            console.error('❌ Approval error:', error);
            const errorMessage = error.error?.message || 'Failed to approve application.';
            this.toastService.showError(errorMessage);
            this.isActionInProgress = false;
            this.approvingApplicationId = null;
            return of(null);
          })
        )
        .subscribe((result) => {
          console.log('✅ Approval result:', result);
          this.isActionInProgress = false;
          this.approvingApplicationId = null;
          if (result) {
            this.toastService.showSuccess(`Application from ${application.name} has been approved successfully!`);
            this.loadDriverApplications();
          }
        });
    }
  }

  rejectApplication(applicationId: string, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.rejectingApplicationId = applicationId;
    this.isActionInProgress = true;
    const application = this.driverApplications.find(app => app.id === applicationId);
    if (application) {
      console.log('Rejecting application for:', application.name, 'ID:', applicationId);
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

    this.isConfirmingRejection = true;
    console.log('🔍 Confirming rejection for:', this.selectedApplicationForRejection.name, 'Reason:', this.rejectionReason);
    console.log('🔍 Current application status:', this.selectedApplicationForRejection.driverApplicationStatus);

    this.adminService.rejectDriverApplication(this.selectedApplicationForRejection!.id, this.rejectionReason)
      .pipe(
        catchError(error => {
          console.error('❌ Rejection error:', error);
          const errorMessage = error.error?.message || 'Failed to reject application.';
          this.toastService.showError(errorMessage);
          this.isConfirmingRejection = false;
          return of(null);
        })
      )
      .subscribe((result) => {
        console.log('✅ Rejection result:', result);
        this.isConfirmingRejection = false;
        if (result) {
          this.toastService.showSuccess(`Application from ${this.selectedApplicationForRejection!.name} has been rejected.`);
          this.loadDriverApplications();
          this.closeRejectionModal();
        }
      });
  }

  closeRejectionModal() {
    this.showRejectionModal = false;
    this.selectedApplicationForRejection = null;
    this.rejectionReason = '';
    this.isActionInProgress = false;
    this.rejectingApplicationId = null;
  }

  // Application Details Modal Methods
  closeApplicationDetailsModal() {
    this.showApplicationDetailsModal = false;
    this.selectedApplicationForReview = null;
  }

  approveApplicationFromModal() {
    if (!this.selectedApplicationForReview) return;
    
    this.approvingApplicationId = this.selectedApplicationForReview.id;
    console.log('Approving application from modal for:', this.selectedApplicationForReview.name);
    
    this.adminService.approveDriverApplication(this.selectedApplicationForReview!.id)
      .pipe(
        catchError(error => {
          console.error('Modal approval error:', error);
          const errorMessage = error.error?.message || 'Failed to approve application from modal.';
          this.toastService.showError(errorMessage);
          this.approvingApplicationId = null;
          return of(null);
        })
      )
      .subscribe((result) => {
        console.log('Modal approval result:', result);
        this.approvingApplicationId = null;
        if (result) {
          this.toastService.showSuccess(`Application from ${this.selectedApplicationForReview!.name} has been approved successfully!`);
          this.closeApplicationDetailsModal();
          this.loadDriverApplications();
        }
      });
  }

  rejectApplicationFromModal() {
    if (!this.selectedApplicationForReview) return;
    
    this.rejectingApplicationId = this.selectedApplicationForReview.id;
    console.log('Rejecting application from modal for:', this.selectedApplicationForReview.name);
    
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
