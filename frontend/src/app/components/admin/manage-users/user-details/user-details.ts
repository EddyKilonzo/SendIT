import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../shared/toast/toast.service';
import { SidebarComponent } from '../../../shared/sidebar/sidebar';
import { AdminService } from '../../../../services/admin.service';
import { catchError, of } from 'rxjs';

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
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



@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.html',
  styleUrl: './user-details.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent]
})
export class UserDetails implements OnInit {
  activeTab = 'overview';
  user: User | null = null;
  
  // Real data for tabs
  userParcels: any[] = [];
  assignedParcels: any[] = [];
  userActivity: any[] = [];
  isLoadingParcels = false;
  isLoadingActivity = false;





  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const userId = params['id'];
      this.loadUserDetails(userId);
    });
  }

  loadUserDetails(userId: string) {
    this.adminService.getUserById(userId)
      .pipe(
        catchError(error => {
          console.error('Error loading user details:', error);
          this.toastService.showError('Failed to load user details');
          this.router.navigate(['/admin', 'manage-users']);
          return of(null);
        })
      )
      .subscribe({
        next: (user) => {
          if (user) {
            this.user = user;
            // Load additional data based on user role
            this.loadUserParcels(userId);
            this.loadUserActivity(userId);
          } else {
            this.toastService.showError('User not found');
            this.router.navigate(['/admin', 'manage-users']);
          }
        }
      });
  }

  loadUserParcels(userId: string) {
    this.isLoadingParcels = true;
    // Load parcels where user is sender or recipient
    this.adminService.getUserParcels(userId)
      .pipe(
        catchError(error => {
          console.error('Error loading user parcels:', error);
          this.toastService.showError('Failed to load user parcels');
          return of({ parcels: [] });
        })
      )
      .subscribe({
        next: (response) => {
          this.userParcels = response.parcels || [];
          this.isLoadingParcels = false;
        }
      });
  }

  loadUserActivity(userId: string) {
    this.isLoadingActivity = true;
    // Load user activity/transactions
    this.adminService.getUserActivity(userId)
      .pipe(
        catchError(error => {
          console.error('Error loading user activity:', error);
          this.toastService.showError('Failed to load user activity');
          return of({ activities: [] });
        })
      )
      .subscribe({
        next: (response) => {
          this.userActivity = response.activities || [];
          this.isLoadingActivity = false;
        }
      });
  }





  setActiveTab(tab: string) {
    this.activeTab = tab;
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

  getTimeSinceJoined(createdAt: string): string {
    const registered = new Date(createdAt);
    const now = new Date();
    
    // Calculate the difference in months
    const yearDiff = now.getFullYear() - registered.getFullYear();
    const monthDiff = now.getMonth() - registered.getMonth();
    const totalMonths = yearDiff * 12 + monthDiff;
    
    // Calculate the difference in days for more precise calculation
    const diffTime = Math.abs(now.getTime() - registered.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else if (totalMonths < 12) {
      return `${totalMonths} month${totalMonths !== 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(totalMonths / 12);
      const remainingMonths = totalMonths % 12;
      if (remainingMonths === 0) {
        return `${years} year${years !== 1 ? 's' : ''} ago`;
      } else {
        return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''} ago`;
      }
    }
  }

  getStatusClass(isActive: boolean, deletedAt?: string): string {
    if (deletedAt) {
      return 'suspended';
    }
    return isActive ? 'active' : 'inactive';
  }

  getParcelStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'in_transit':
      case 'in-transit':
        return 'status-in-transit';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  getActivityStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'status-completed';
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return 'status-pending';
    }
  }

  viewParcelDetails(parcelId: string) {
    this.router.navigate(['/admin', 'parcel-details', parcelId]);
  }





  updateUserStatus(userId: string, newStatus: string) {
    // Make API call to update user status
    this.adminService.updateUserStatus(userId, newStatus)
      .pipe(
        catchError(error => {
          console.error('Error updating user status:', error);
          this.toastService.showError('Failed to update user status');
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          if (response && this.user) {
            // Update user object based on new status
            if (newStatus === 'active') {
              this.user.isActive = true;
              this.user.deletedAt = undefined;
            } else if (newStatus === 'inactive') {
              this.user.isActive = false;
              this.user.deletedAt = undefined;
            } else if (newStatus === 'suspended') {
              this.user.isActive = false;
              this.user.deletedAt = new Date().toISOString();
            }
            
            const statusText = newStatus === 'active' ? 'activated' : 
                             newStatus === 'inactive' ? 'deactivated' : 'suspended';
            const userName = this.user.name;
            this.toastService.showSuccess(
              `${userName}'s account has been ${statusText} successfully.`,
              4000
            );
          }
        }
      });
  }

  showStatusModal = false;
  selectedStatus: string = 'active';

  openStatusModal() {
    if (this.user) {
      if (this.user.isActive && !this.user.deletedAt) {
        this.selectedStatus = 'active';
      } else if (this.user.deletedAt) {
        this.selectedStatus = 'suspended';
      } else {
        this.selectedStatus = 'inactive';
      }
    }
    this.showStatusModal = true;
  }

  closeStatusModal() {
    this.showStatusModal = false;
  }

  confirmStatusUpdate() {
    if (this.user) {
      this.updateUserStatus(this.user.id, this.selectedStatus);
      this.closeStatusModal();
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
} 