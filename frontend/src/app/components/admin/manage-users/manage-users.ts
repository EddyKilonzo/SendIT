import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ToastService } from '../../shared/toast/toast.service';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Driver' | 'User';
  status: 'Active' | 'Inactive';
  registered: string;
  avatar: string;
}

interface DriverApplication {
  id: string;
  applicantName: string;
  applicantEmail: string;
  licenseNumber: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  reason?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  applicationDate: Date;
  approvalDate?: Date;
  rejectionReason?: string;
}

@Component({
  selector: 'app-manage-users',
  templateUrl: './manage-users.html',
  styleUrl: './manage-users.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class ManageUsers {
  constructor(
    private router: Router,
    private toastService: ToastService
  ) {}
  
  // User role for role-based access control
  userRole: string = 'ADMIN'; // Default role for admin component, will be set from auth service later
  
  // Tab management
  activeTab = 'users';
  
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
  users: User[] = [
    {
      id: '1',
      name: 'Sophia Clark',
      email: 'sophia.clark@email.com',
      phone: '123-456-7890',
      role: 'User',
      status: 'Active',
      registered: '2023-09-15',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '2',
      name: 'Ethan Bennett',
      email: 'ethan.bennett@email.com',
      phone: '123-456-7891',
      role: 'Driver',
      status: 'Active',
      registered: '2023-09-12',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '3',
      name: 'Olivia Hayes',
      email: 'olivia.hayes@email.com',
      phone: '123-456-7892',
      role: 'User',
      status: 'Active',
      registered: '2023-09-13',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '4',
      name: 'Liam Foster',
      email: 'liam.foster@email.com',
      phone: '123-456-7893',
      role: 'Driver',
      status: 'Active',
      registered: '2023-04-05',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '5',
      name: 'Ava Mitchell',
      email: 'ava.mitchell@email.com',
      phone: '123-456-7894',
      role: 'User',
      status: 'Active',
      registered: '2023-09-11',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '6',
      name: 'Noah Carter',
      email: 'noah.carter@email.com',
      phone: '123-456-7895',
      role: 'Driver',
      status: 'Inactive',
      registered: '2023-06-18',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '7',
      name: 'Isabella Reed',
      email: 'isabella.reed@email.com',
      phone: '123-456-7896',
      role: 'User',
      status: 'Inactive',
      registered: '2023-07-22',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '8',
      name: 'Jackson Cole',
      email: 'jackson.cole@email.com',
      phone: '123-456-7897',
      role: 'Driver',
      status: 'Active',
      registered: '2023-08-30',
      avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '9',
      name: 'Mia Hughes',
      email: 'mia.hughes@email.com',
      phone: '123-456-7898',
      role: 'User',
      status: 'Inactive',
      registered: '2023-09-10',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop&crop=entropy'
    },
    {
      id: '10',
      name: 'Aiden Parker',
      email: 'aiden.parker@email.com',
      phone: '123-456-7899',
      role: 'Driver',
      status: 'Active',
      registered: '2023-10-11',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop&crop=entropy'
    }
  ];

  // Driver Applications Data
  driverApplications: DriverApplication[] = [
    {
      id: '1',
      applicantName: 'John Smith',
      applicantEmail: 'john.smith@email.com',
      licenseNumber: 'DL123456789',
      vehicleNumber: 'KCA 123A',
      vehicleType: 'CAR',
      reason: 'I have been driving for 5 years and I am looking for a flexible job that allows me to work on my own schedule. I am reliable and have a clean driving record.',
      status: 'PENDING',
      applicationDate: new Date('2024-01-15')
    },
    {
      id: '2',
      applicantName: 'Sarah Johnson',
      applicantEmail: 'sarah.johnson@email.com',
      licenseNumber: 'DL987654321',
      vehicleNumber: 'KCB 456B',
      vehicleType: 'MOTORCYCLE',
      reason: 'I am a student looking for part-time work. I have a motorcycle and can deliver packages efficiently in the city area.',
      status: 'APPROVED',
      applicationDate: new Date('2024-01-10'),
      approvalDate: new Date('2024-01-12')
    },
    {
      id: '3',
      applicantName: 'Michael Brown',
      applicantEmail: 'michael.brown@email.com',
      licenseNumber: 'DL456789123',
      vehicleNumber: 'KCC 789C',
      vehicleType: 'VAN',
      reason: 'I have experience in logistics and delivery. I own a van and can handle larger packages and multiple deliveries efficiently.',
      status: 'REJECTED',
      applicationDate: new Date('2024-01-08'),
      rejectionReason: 'Vehicle registration expired'
    },
    {
      id: '4',
      applicantName: 'Emily Davis',
      applicantEmail: 'emily.davis@email.com',
      licenseNumber: 'DL789123456',
      vehicleNumber: 'KCD 012D',
      vehicleType: 'CAR',
      reason: 'I am a stay-at-home parent looking for flexible work hours. I have a reliable car and can work during school hours.',
      status: 'PENDING',
      applicationDate: new Date('2024-01-20')
    },
    {
      id: '5',
      applicantName: 'David Wilson',
      applicantEmail: 'david.wilson@email.com',
      licenseNumber: 'DL321654987',
      vehicleNumber: 'KCE 345E',
      vehicleType: 'TRUCK',
      reason: 'I have a commercial driver\'s license and experience in heavy vehicle operation. I can handle large and heavy packages.',
      status: 'APPROVED',
      applicationDate: new Date('2024-01-05'),
      approvalDate: new Date('2024-01-07')
    }
  ];

  // Pagination
  currentPage = 1;
  usersPerPage = 8;

  get filteredUsers(): User[] {
    let filtered = this.users;
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.phone.includes(search)
      );
    }
    if (this.selectedStatus) {
      filtered = filtered.filter(user => user.status === this.selectedStatus);
    }
    if (this.selectedRole) {
      filtered = filtered.filter(user => user.role === this.selectedRole);
    }
    return filtered;
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.usersPerPage;
    return this.filteredUsers.slice(start, start + this.usersPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.usersPerPage);
  }

  setPage(page: number) {
    this.currentPage = page;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedRole = '';
    this.currentPage = 1;
  }

  viewUserDetails(userId: string) {
    this.router.navigate(['/admin-user-details', userId]);
  }

  // Tab Management
  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'users') {
      this.currentPage = 1;
    } else {
      this.currentApplicationPage = 1;
    }
  }

  // Driver Applications Methods
  get filteredApplications(): DriverApplication[] {
    let filtered = this.driverApplications;
    if (this.selectedApplicationStatus) {
      filtered = filtered.filter(app => app.status === this.selectedApplicationStatus);
    }
    return filtered;
  }

  get paginatedApplications(): DriverApplication[] {
    const start = (this.currentApplicationPage - 1) * this.applicationsPerPage;
    return this.filteredApplications.slice(start, start + this.applicationsPerPage);
  }

  get totalApplicationPages(): number {
    return Math.ceil(this.filteredApplications.length / this.applicationsPerPage);
  }

  setApplicationPage(page: number) {
    this.currentApplicationPage = page;
  }

  clearApplicationFilters() {
    this.selectedApplicationStatus = '';
    this.currentApplicationPage = 1;
  }

  // Application Statistics
  get pendingApplicationsCount(): number {
    return this.driverApplications.filter(app => app.status === 'PENDING').length;
  }

  get approvedApplicationsCount(): number {
    return this.driverApplications.filter(app => app.status === 'APPROVED').length;
  }

  get rejectedApplicationsCount(): number {
    return this.driverApplications.filter(app => app.status === 'REJECTED').length;
  }

  // Status Methods
  getStatusClass(status: string): string {
    switch (status) {
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
      // Show loading state
      this.toastService.showInfo('Processing application approval...');
      
      // Simulate API call
      setTimeout(() => {
        application.status = 'APPROVED';
        application.approvalDate = new Date();
        
        // Show success message
        this.toastService.showSuccess(`Application from ${application.applicantName} has been approved successfully!`);
        
        // Update statistics
        this.updateApplicationStats();
        
        console.log('Application approved:', applicationId);
      }, 1500);
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

    // Show loading state
    this.toastService.showInfo('Processing application rejection...');
    
    // Simulate API call
    setTimeout(() => {
      this.selectedApplicationForRejection!.status = 'REJECTED';
      this.selectedApplicationForRejection!.rejectionReason = this.rejectionReason;
      
      // Show success message
      this.toastService.showSuccess(`Application from ${this.selectedApplicationForRejection!.applicantName} has been rejected.`);
      
      // Update statistics
      this.updateApplicationStats();
      
      // Close modal
      this.closeRejectionModal();
      
      console.log('Application rejected:', this.selectedApplicationForRejection!.id);
    }, 1500);
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
    
    // Show loading state
    this.toastService.showInfo('Processing application approval...');
    
    // Simulate API call
    setTimeout(() => {
      this.selectedApplicationForReview!.status = 'APPROVED';
      this.selectedApplicationForReview!.approvalDate = new Date();
      
      // Update the original application in the list
      const originalApp = this.driverApplications.find(app => app.id === this.selectedApplicationForReview!.id);
      if (originalApp) {
        originalApp.status = 'APPROVED';
        originalApp.approvalDate = new Date();
      }
      
      // Show success message
      this.toastService.showSuccess(`Application from ${this.selectedApplicationForReview!.applicantName} has been approved successfully!`);
      
      // Close modal
      this.closeApplicationDetailsModal();
      
      console.log('Application approved from modal:', this.selectedApplicationForReview!.id);
    }, 1500);
  }

  rejectApplicationFromModal() {
    if (!this.selectedApplicationForReview) return;
    
    this.selectedApplicationForRejection = this.selectedApplicationForReview;
    this.rejectionReason = '';
    this.showRejectionModal = true;
    this.closeApplicationDetailsModal();
  }

  // Helper method to update application statistics
  private updateApplicationStats() {
    // This method is called after status changes to ensure statistics are up to date
    // The getters will automatically recalculate the counts
    console.log('Application statistics updated');
  }
}
