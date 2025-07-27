import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { BaseApiService, Parcel, UserDashboardData } from '../../../services/base-api.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ToastService } from '../../shared/toast/toast.service';

interface Activity {
  parcelId: string;
  status: 'In Transit' | 'Delivered' | 'Pending' | 'Cancelled';
  date: string;
  icon: string;
}

interface SummaryCard {
  title: string;
  value: string | number;
  icon: string;
}

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboard.css']
})
export class UserDashboard implements OnInit {
  userName = 'User';
  currentUser: any = null;
  parcelsInTransit = 0;
  scheduledForTomorrow = 0;
  isLoading = false;
  
  recentActivities: Activity[] = [];
  summaryCards: SummaryCard[] = [];
  sentParcels: Parcel[] = [];
  receivedParcels: Parcel[] = [];
  allParcels: Parcel[] = [];

  activeTab: 'sent' | 'received' = 'sent';
  totalParcels = 0;
  growthPercentage = 0;

  constructor(
    private authService: AuthService,
    private apiService: BaseApiService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser?.name) {
      this.userName = this.currentUser.name;
    }
    
    this.loadDashboardData();
  }

  private loadDashboardData() {
    this.isLoading = true;
    
    // Load dashboard data from the new endpoint
    this.apiService.getUserDashboardData().subscribe({
      next: (response) => {
        // Update dashboard metrics
        this.parcelsInTransit = response.parcelsInTransit;
        this.scheduledForTomorrow = response.scheduledForTomorrow;
        this.totalParcels = response.totalParcels;
        
        // Update summary cards
        this.summaryCards = response.summaryCards;
        
        // Process recent parcels
        this.allParcels = response.recentParcels;
        
        // Separate sent and received parcels
        this.sentParcels = this.allParcels.filter(parcel => 
          parcel.senderId === this.currentUser?.id
        );
        this.receivedParcels = this.allParcels.filter(parcel => 
          parcel.recipientId === this.currentUser?.id
        );
        
        // Generate recent activities from recent parcels
        this.generateRecentActivities();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.toastService.showError('Failed to load dashboard data');
        this.isLoading = false;
        
        // Fallback to fetching all parcels if dashboard endpoint fails
        this.loadAllParcelsFallback();
      }
    });
  }

  private loadAllParcelsFallback() {
    // Fallback method to fetch all user parcels
    this.apiService.getAllUserParcels().subscribe({
      next: (response) => {
        this.allParcels = response.parcels;
        this.totalParcels = response.total;
        
        // Separate sent and received parcels
        this.sentParcels = this.allParcels.filter(parcel => 
          parcel.senderId === this.currentUser?.id
        );
        this.receivedParcels = this.allParcels.filter(parcel => 
          parcel.recipientId === this.currentUser?.id
        );
        
        // Calculate dashboard metrics
        this.calculateDashboardMetrics();
        
        // Generate recent activities
        this.generateRecentActivities();
        
        // Generate summary cards
        this.generateSummaryCards();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading parcels fallback:', error);
        this.toastService.showError('Failed to load parcel data');
        this.isLoading = false;
      }
    });
  }

  private calculateDashboardMetrics() {
    // Calculate parcels in transit
    this.parcelsInTransit = this.allParcels.filter(parcel => 
      ['assigned', 'picked_up', 'in_transit'].includes(parcel.status)
    ).length;
    
    // Calculate scheduled for tomorrow (parcels with estimated pickup time tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    this.scheduledForTomorrow = this.allParcels.filter(parcel => {
      if (!parcel.estimatedPickupTime) return false;
      const pickupDate = new Date(parcel.estimatedPickupTime);
      return pickupDate >= tomorrow && pickupDate < dayAfterTomorrow;
    }).length;
  }

  private generateRecentActivities() {
    // Get recent parcels and create activities
    const recentParcels = this.allParcels
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
    
    this.recentActivities = recentParcels.map(parcel => ({
      parcelId: parcel.trackingNumber,
      status: this.mapStatusToActivityStatus(parcel.status),
      date: this.formatDate(parcel.updatedAt),
      icon: this.getStatusIcon(parcel.status)
    }));
  }

  private generateSummaryCards() {
    const totalSpent = this.allParcels
      .filter(parcel => parcel.deliveryFee)
      .reduce((sum, parcel) => sum + (parcel.deliveryFee || 0), 0);
    
    this.summaryCards = [
      {
        title: 'Parcels Sent',
        value: this.sentParcels.length,
        icon: 'fas fa-paper-plane'
      },
      {
        title: 'Parcels Received',
        value: this.receivedParcels.length,
        icon: 'fas fa-inbox'
      },
      {
        title: 'Total Spent',
        value: `ksh${totalSpent.toFixed(0)}`,
        icon: 'fas fa-dollar-sign'
      }
    ];
  }

  private mapStatusToActivityStatus(status: string): 'In Transit' | 'Delivered' | 'Pending' | 'Cancelled' {
    switch (status) {
      case 'pending':
      case 'assigned':
        return 'Pending';
      case 'picked_up':
      case 'in_transit':
      case 'delivered_to_recipient':
        return 'In Transit';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
      case 'assigned':
        return 'fas fa-clock';
      case 'picked_up':
      case 'in_transit':
      case 'delivered_to_recipient':
        return 'fas fa-truck';
      case 'delivered':
        return 'fas fa-check';
      case 'cancelled':
        return 'fas fa-times';
      default:
        return 'fas fa-info-circle';
    }
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  }



  switchTab(tab: 'sent' | 'received') {
    this.activeTab = tab;
  }

  getRecentParcels(): Parcel[] {
    return this.activeTab === 'sent' ? this.sentParcels : this.receivedParcels;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
      case 'assigned':
        return 'status-pending';
      case 'picked_up':
      case 'in_transit':
      case 'delivered_to_recipient':
        return 'status-transit';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getActivityIcon(activity: Activity): string {
    return activity.icon;
  }

  getActivityText(activity: Activity): string {
    switch (activity.status) {
      case 'In Transit':
        return `Estimated delivery: ${activity.date}`;
      case 'Delivered':
        return `Delivered on: ${activity.date}`;
      case 'Pending':
        return `Scheduled for pickup: ${activity.date}`;
      case 'Cancelled':
        return `Cancelled on: ${activity.date}`;
      default:
        return activity.date;
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'assigned':
        return 'Assigned';
      case 'picked_up':
        return 'Picked Up';
      case 'in_transit':
        return 'In Transit';
      case 'delivered_to_recipient':
        return 'Delivered to Recipient';
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  // Computed properties for template binding
  get deliveredParcelsCount(): number {
    return this.allParcels.filter(p => p.status === 'delivered').length;
  }

  get pendingParcelsCount(): number {
    return this.allParcels.filter(p => ['pending', 'assigned'].includes(p.status)).length;
  }
} 