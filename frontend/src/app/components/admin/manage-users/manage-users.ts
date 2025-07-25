import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ToastService } from '../../shared/toast/toast.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { AdminService } from '../../../services/admin.service';
import { catchError, of } from 'rxjs';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
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
    private adminService: AdminService
  ) {}
  
  // User role for role-based access control
  userRole: string = 'ADMIN';
  
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
    console.log('ManageUsers component initialized');
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
        },
        error: (error) => {
          console.error('❌ API connection failed:', error);
          this.toastService.showError('API connection failed. Please check your backend server.');
        }
      });
  }

  loadUsers() {
    this.isLoadingUsers = true;
    
    const query: any = {};
    if (this.searchTerm) query.search = this.searchTerm;
    if (this.selectedStatus) query.isActive = this.selectedStatus === 'Active';
    if (this.selectedRole) query.role = this.selectedRole;
    
    console.log('Loading users with query:', query);
    console.log('Page:', this.currentPage, 'Limit:', this.usersPerPage);
    
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
          console.log('Users API response:', response);
          this.users = response.users || [];
          this.totalUsers = response.total || 0;
          this.isLoadingUsers = false;
          console.log('Loaded users:', this.users.length, 'Total:', this.totalUsers);
        },
        error: (error) => {
          console.error('Subscription error:', error);
          this.isLoadingUsers = false;
        }
      });
  }

  loadDriverApplications() {
    this.isLoadingApplications = true;
    
    const query: any = {};
    if (this.selectedApplicationStatus) query.status = this.selectedApplicationStatus; // Changed from driverApplicationStatus to status
    
    console.log('Loading driver applications with query:', query);
    console.log('Page:', this.currentApplicationPage, 'Limit:', this.applicationsPerPage);
    
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
          console.log('Driver applications API response:', response);
          this.driverApplications = response.applications || [];
          this.totalApplications = response.total || 0;
          this.isLoadingApplications = false;
          console.log('Loaded applications:', this.driverApplications.length, 'Total:', this.totalApplications);
        },
        error: (error) => {
          console.error('Subscription error for applications:', error);
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
    this.router.navigate(['/admin-user-details', userId]);
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
}
