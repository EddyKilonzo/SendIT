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
  
  // Additional real data
  userStats: any = null;
  driverStats: any = null;
  isLoadingStats = false;
  
  // Customer-specific data
  customerStats = {
    totalParcelsSent: 0,
    totalParcelsReceived: 0,
    totalSpent: 0,
    averageRating: 0,
    lastOrderDate: null as string | null
  };
  
  // Driver-specific data
  driverPerformance = {
    totalDeliveries: 0,
    completedDeliveries: 0,
    onTimeDeliveries: 0,
    averageRating: 0,
    totalEarnings: 0,
    averageDeliveryTime: 0,
    successRate: 0,
    currentAssignments: 0,
    monthlyEarnings: 0,
    weeklyDeliveries: 0,
    estimatedTime: 0,
    actualTime: 0,
    timeAccuracy: 0
  };





  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService,
    private adminService: AdminService
  ) {}

  ngOnInit() {
    console.log('🔄 UserDetails ngOnInit called');
    
    // Get data passed from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      console.log('📊 Navigation state received:', state);
      this.user = state.userData;
      
      // Load comprehensive real data
      this.route.params.subscribe(params => {
        const userId = params['id'];
        console.log('🆔 User ID from route params:', userId);
        this.loadComprehensiveUserData(userId);
      });
    } else {
      console.log('⚠️ No navigation state, loading from API');
      // Fallback: load user data from API
      this.route.params.subscribe(params => {
        const userId = params['id'];
        console.log('🆔 User ID from route params (fallback):', userId);
        this.loadComprehensiveUserData(userId);
      });
    }
  }

  private loadComprehensiveUserData(userId: string) {
    console.log('🔄 loadComprehensiveUserData called for user ID:', userId);
    this.isLoadingStats = true;
    
    // If user data is not available, load it first
    if (!this.user) {
      console.log('👤 User data not available, loading user details first...');
      this.adminService.getUserById(userId).subscribe({
        next: (user) => {
          this.user = user;
          console.log('✅ User data loaded:', user);
          this.loadUserStatsAndRoleData(userId);
        },
        error: (error) => {
          console.error('❌ Error loading user data:', error);
          this.toastService.showError('Failed to load user data');
          this.isLoadingStats = false;
        }
      });
    } else {
      this.loadUserStatsAndRoleData(userId);
    }
  }

  private loadUserStatsAndRoleData(userId: string) {
    console.log('🔄 loadUserStatsAndRoleData called for user ID:', userId);
    
    // Skip getUserStats since it doesn't exist in backend
    // Go directly to role-specific data loading
    if (this.user?.role === 'DRIVER') {
      console.log('🚚 User is a driver, loading driver data...');
      this.loadDriverComprehensiveData(userId);
    } else if (this.user?.role === 'CUSTOMER') {
      console.log('👤 User is a customer, loading customer data...');
      this.loadCustomerComprehensiveData(userId);
    } else {
      console.log('⚠️ User role not recognized:', this.user?.role);
      this.isLoadingStats = false;
    }
    
    // Load common data
    this.loadUserParcels(userId);
    this.loadUserActivity(userId);
  }

  private loadDriverComprehensiveData(driverId: string) {
    console.log('🔄 Loading driver comprehensive data for ID:', driverId);
    
    // Load driver parcels and statistics using the new comprehensive endpoint
    this.adminService.getDriverComprehensiveData(driverId).subscribe({
      next: (driverData) => {
        console.log('✅ Driver comprehensive data loaded:', driverData);
        console.log('📊 Stats received:', driverData.stats);
        console.log('📦 Parcels received:', driverData.parcels?.length || 0);
        
        // Update assigned parcels
        this.assignedParcels = driverData.parcels || [];
        
        // Update driver stats
        if (driverData.stats) {
          this.driverStats = driverData.stats;
          this.updateDriverPerformanceData(driverData.stats);
          console.log('📈 Updated driver performance data:', this.driverPerformance);
        }
        
        // Update user object with driver data
        if (this.user && driverData.stats) {
          this.user = {
            ...this.user,
            ...driverData.stats
          };
        }
        
        // Set loading to false when data is loaded
        this.isLoadingStats = false;
      },
      error: (error) => {
        console.error('❌ Error loading driver comprehensive data:', error);
        this.toastService.showError('Failed to load driver data');
        // Set loading to false even on error
        this.isLoadingStats = false;
      }
    });
  }

  private loadCustomerComprehensiveData(customerId: string) {
    console.log('🔄 Loading customer comprehensive data for ID:', customerId);
    
    // For customers, stats are calculated after parcels are loaded
    // So we just set loading to false here
    this.isLoadingStats = false;
  }

  private updateDriverPerformanceData(stats: any) {
    console.log('🔄 Updating driver performance data with stats:', stats);
    console.log('📊 Average Rating from stats:', stats.averageRating);
    
    // Use real statistics from backend instead of calculating
    this.driverPerformance = {
      totalDeliveries: stats.totalDeliveries || 0,
      completedDeliveries: stats.completedDeliveries || 0,
      onTimeDeliveries: stats.onTimeDeliveries || 0,
      averageRating: stats.averageRating || 0,
      totalEarnings: stats.totalEarnings || 0,
      averageDeliveryTime: stats.averageDeliveryTime || 0,
      successRate: stats.successRate || 0,
      currentAssignments: stats.currentAssignments || 0,
      monthlyEarnings: stats.monthlyEarnings || 0,
      weeklyDeliveries: stats.weeklyDeliveries || 0,
      estimatedTime: stats.estimatedTime || 0,
      actualTime: stats.actualTime || 0,
      timeAccuracy: stats.timeAccuracy || 0
    };
    
    console.log('✅ Updated driver performance:', this.driverPerformance);
    console.log('📊 Final average rating:', this.driverPerformance.averageRating);
  }

  private calculateCustomerStats() {
    if (!this.userParcels.length) return;
    
    const sentParcels = this.userParcels.filter(p => p.senderId === this.user?.id);
    const receivedParcels = this.userParcels.filter(p => p.recipientId === this.user?.id);
    
    this.customerStats = {
      totalParcelsSent: sentParcels.length,
      totalParcelsReceived: receivedParcels.length,
      totalSpent: sentParcels.reduce((sum, p) => sum + (p.deliveryFee || 0), 0),
      averageRating: this.calculateAverageRating(sentParcels),
      lastOrderDate: this.getLastOrderDate(sentParcels)
    };
  }

  private calculateAverageRating(parcels: any[]): number {
    const ratedParcels = parcels.filter(p => p.rating);
    if (!ratedParcels.length) return 0;
    
    const totalRating = ratedParcels.reduce((sum, p) => sum + p.rating, 0);
    return Math.round((totalRating / ratedParcels.length) * 10) / 10;
  }

  private getLastOrderDate(parcels: any[]): string | null {
    if (!parcels.length) return null;
    
    const sortedParcels = parcels.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    return sortedParcels[0].createdAt;
  }

  private calculateAverageDeliveryTime(parcels: any[]): number {
    const completedParcels = parcels.filter(p => 
      p.status === 'delivered' && 
      p.actualDeliveryTime && 
      p.actualPickupTime
    );
    
    if (!completedParcels.length) return 0;
    
    const totalDeliveryTime = completedParcels.reduce((sum, parcel) => {
      try {
        const pickupTime = new Date(parcel.actualPickupTime).getTime();
        const deliveryTime = new Date(parcel.actualDeliveryTime).getTime();
        
        if (isNaN(pickupTime) || isNaN(deliveryTime)) return sum;
        
        const actualTimeMinutes = (deliveryTime - pickupTime) / (1000 * 60); // Convert to minutes
        return sum + actualTimeMinutes;
      } catch (error) {
        return sum;
      }
    }, 0);
    
    return Math.round(totalDeliveryTime / completedParcels.length);
  }

  private calculateEstimatedVsActualTime(parcels: any[]): { estimated: number; actual: number; accuracy: number } {
    const completedParcels = parcels.filter(p => 
      p.status === 'delivered' && 
      p.actualDeliveryTime && 
      p.actualPickupTime &&
      p.estimatedDeliveryTime
    );
    
    if (!completedParcels.length) return { estimated: 0, actual: 0, accuracy: 0 };
    
    let totalEstimated = 0;
    let totalActual = 0;
    
    completedParcels.forEach(parcel => {
      try {
        const pickupTime = new Date(parcel.actualPickupTime).getTime();
        const deliveryTime = new Date(parcel.actualDeliveryTime).getTime();
        
        if (isNaN(pickupTime) || isNaN(deliveryTime)) return;
        
        const actualTimeMinutes = (deliveryTime - pickupTime) / (1000 * 60);
        
        // Get estimated time from parcel data (in minutes)
        const estimatedTimeMinutes = parcel.estimatedDeliveryTime || 0;
        
        totalEstimated += estimatedTimeMinutes;
        totalActual += actualTimeMinutes;
      } catch (error) {
        // Skip this parcel if there's an error with date parsing
        return;
      }
    });
    
    const avgEstimated = totalEstimated / completedParcels.length;
    const avgActual = totalActual / completedParcels.length;
    const accuracy = avgEstimated > 0 ? ((avgEstimated - avgActual) / avgEstimated) * 100 : 0;
    
    return {
      estimated: Math.round(avgEstimated),
      actual: Math.round(avgActual),
      accuracy: Math.round(accuracy)
    };
  }

  private loadDriverData() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      
      // Load driver parcels if available
      if (state.driverParcels) {
        this.assignedParcels = state.driverParcels;
      }
      
      // Load driver stats if available
      if (state.driverStats) {
        // Update user object with driver stats
        if (this.user) {
          this.user = {
            ...this.user,
            ...state.driverStats
          };
        }
      }
    }
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
          
          // Calculate customer stats after parcels are loaded
          if (this.user?.role === 'CUSTOMER') {
            this.calculateCustomerStats();
            // Set loading stats to false for customers after calculating stats
            this.isLoadingStats = false;
          }
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





  showStatusModal = false;
  selectedStatus: string = 'active';
  isUpdatingStatus = false; // Loading state for status updates

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

  updateUserStatus(userId: string, newStatus: string) {
    // Set loading state
    this.isUpdatingStatus = true;
    
    // Determine the correct action based on user's current status and desired status
    let action: string;
    
    if (newStatus === 'active') {
      // If user is currently suspended (has deletedAt), use 'unsuspend'
      // If user is currently inactive (no deletedAt but isActive=false), use 'activate'
      if (this.user?.deletedAt) {
        action = 'unsuspend';
      } else {
        action = 'activate';
      }
    } else if (newStatus === 'inactive') {
      action = 'deactivate';
    } else if (newStatus === 'suspended') {
      action = 'suspend';
    } else {
      action = 'activate';
    }
    
    console.log(`🔄 Updating user status: ${newStatus}, sending action: ${action}`);
    console.log(`🔄 User current status - isActive: ${this.user?.isActive}, deletedAt: ${this.user?.deletedAt}`);
    
    // Make API call to update user status
    this.adminService.updateUserStatusWithAction(userId, action)
      .pipe(
        catchError(error => {
          console.error('Error updating user status:', error);
          this.toastService.showError('Failed to update user status');
          this.isUpdatingStatus = false; // Reset loading state on error
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
            
            // Show success toast and reset loading state
            this.toastService.showSuccess(
              `${userName}'s account has been ${statusText} successfully.`,
              4000
            );
            this.isUpdatingStatus = false; // Reset loading state after success
          }
        }
      });
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

  // Helper method to format currency
  formatCurrency(amount: number): string {
    if (!amount) return 'KSH 0';
    return `KSH ${amount.toLocaleString('en-KE')}`;
  }

  // Helper method to format percentage
  formatPercentage(value: number): string {
    if (!value) return '0%';
    return `${value.toFixed(1)}%`;
  }

  // Helper method to get status color
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
      case 'delivered':
      case 'completed':
        return '#28a745';
      case 'inactive':
      case 'suspended':
        return '#dc3545';
      case 'pending':
      case 'in-transit':
        return '#ffc107';
      default:
        return '#6c757d';
    }
  }
} 