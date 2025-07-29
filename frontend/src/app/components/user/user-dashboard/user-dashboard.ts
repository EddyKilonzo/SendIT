import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { BaseApiService, Parcel, UserDashboardData } from '../../../services/base-api.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ToastService } from '../../shared/toast/toast.service';


interface SummaryCard {
  title: string;
  value: string | number;
  icon: string;
  isTotalSpent?: boolean;
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
  totalSpent = 0;
  isLoading = false;

  summaryCards: SummaryCard[] = [];
  sentParcels: Parcel[] = [];
  receivedParcels: Parcel[] = [];
  allParcels: Parcel[] = [];

  activeTab: 'sent' | 'received' = 'sent';

  constructor(
    private authService: AuthService,
    private apiService: BaseApiService,
    private toastService: ToastService,
    private router: Router
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    console.log('Current user:', this.currentUser);
    
    if (!this.currentUser) {
      console.error('No current user found');
      this.toastService.showError('Please login to view your dashboard');
      return;
    }
    
    if (this.currentUser?.name) {
      this.userName = this.currentUser.name;
    }
    
    this.loadDashboardData();
  }

  // Manual refresh method
  refreshDashboard() {
    console.log('Manual refresh triggered');
    this.loadDashboardData();
    this.toastService.showInfo('Dashboard refreshed');
  }

  private loadDashboardData() {
    this.isLoading = true;
    console.log('Loading dashboard data...');
    console.log('Current user:', this.currentUser);
    console.log('Auth token:', this.authService.getToken() ? 'Present' : 'Missing');
    
    // Load dashboard data from the backend endpoint
    this.apiService.getUserDashboardData().subscribe({
      next: (response: UserDashboardData) => {
        console.log('Dashboard data received:', response);
        
        // Update dashboard metrics
        this.parcelsInTransit = response.parcelsInTransit || 0;
        this.scheduledForTomorrow = response.scheduledForTomorrow || 0;
        this.totalSpent = response.totalSpent || 0;
        
        // Update summary cards
        this.summaryCards = response.summaryCards || [];
        console.log('Summary cards:', this.summaryCards);
        
        // Process recent parcels
        this.allParcels = response.recentParcels || [];
        console.log('All parcels:', this.allParcels);
        console.log('Current user ID:', this.currentUser?.id);
        console.log('Current user name:', this.currentUser?.name);
        
        // Log first parcel details for debugging
        if (this.allParcels.length > 0) {
          console.log('First parcel senderId:', this.allParcels[0].senderId);
          console.log('First parcel senderName:', this.allParcels[0].senderName);
          console.log('First parcel recipientId:', this.allParcels[0].recipientId);
          console.log('First parcel recipientName:', this.allParcels[0].recipientName);
        }
        
        // Separate sent and received parcels - try both ID and name matching
        this.sentParcels = this.allParcels.filter(parcel => 
          parcel.senderId === this.currentUser?.id || parcel.senderName === this.currentUser?.name
        );
        this.receivedParcels = this.allParcels.filter(parcel => 
          parcel.recipientId === this.currentUser?.id || parcel.recipientName === this.currentUser?.name
        );
        
        console.log('Sent parcels:', this.sentParcels);
        console.log('Received parcels:', this.receivedParcels);
        
        // Regenerate summary cards to ensure consistency with spending calculations
        this.generateSummaryCards();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
        this.toastService.showError('Failed to load dashboard data');
        this.isLoading = false;
        
        // Fallback to fetching all parcels if dashboard endpoint fails
        this.loadAllParcelsFallback();
      }
    });
  }

  private loadAllParcelsFallback() {
    console.log('Using fallback method to load parcels...');
    // Fallback method to fetch all user parcels
    this.apiService.getAllUserParcels().subscribe({
      next: (response) => {
        console.log('Fallback response:', response);
        this.allParcels = response.parcels || [];
        
        // Separate sent and received parcels - try both ID and name matching
        this.sentParcels = this.allParcels.filter(parcel => 
          parcel.senderId === this.currentUser?.id || parcel.senderName === this.currentUser?.name
        );
        this.receivedParcels = this.allParcels.filter(parcel => 
          parcel.recipientId === this.currentUser?.id || parcel.recipientName === this.currentUser?.name
        );
        
        console.log('Fallback - Sent parcels:', this.sentParcels);
        console.log('Fallback - Received parcels:', this.receivedParcels);
        
        // Calculate dashboard metrics
        this.calculateDashboardMetrics();
        
        // Calculate total spent from sent parcels for fallback
        this.totalSpent = this.sentParcels
          .filter(parcel => parcel.deliveryFee)
          .reduce((sum, parcel) => sum + (parcel.deliveryFee || 0), 0);
        
        // Generate summary cards
        this.generateSummaryCards();
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading parcels fallback:', error);
        console.error('Fallback error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          error: error.error
        });
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
      try {
        const pickupDate = new Date(parcel.estimatedPickupTime);
        if (isNaN(pickupDate.getTime())) return false;
        return pickupDate >= tomorrow && pickupDate < dayAfterTomorrow;
      } catch (error) {
        return false;
      }
    }).length;
  }



  private generateSummaryCards() {
    const deliveredParcels = this.allParcels.filter(p => p.status === 'delivered').length;
    const inTransitParcels = this.allParcels.filter(p => ['assigned', 'picked_up', 'in_transit'].includes(p.status)).length;
    
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
        title: 'In Transit',
        value: inTransitParcels,
        icon: 'fas fa-truck'
      }
    ];
  }

  private generateDefaultSummaryCards() {
    this.summaryCards = [
      {
        title: 'Parcels Sent',
        value: 0,
        icon: 'fas fa-paper-plane'
      },
      {
        title: 'Parcels Received',
        value: 0,
        icon: 'fas fa-inbox'
      },
      {
        title: 'In Transit',
        value: 0,
        icon: 'fas fa-truck'
      }
    ];
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
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
    } catch (error) {
      return 'N/A';
    }
  }

  switchTab(tab: 'sent' | 'received') {
    this.activeTab = tab;
    
    // Scroll to top when switching tabs for better UX
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      });
    }, 100);
    
    this.loadDashboardData();
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

  // Spending calculation methods
  getTotalSpent(): number {
    return this.totalSpent;
  }

  getParcelsWithFees(): Parcel[] {
    return this.sentParcels.filter(parcel => parcel.deliveryFee && parcel.deliveryFee > 0);
  }

  getAverageSpent(): number {
    const parcelsWithFees = this.getParcelsWithFees();
    if (parcelsWithFees.length === 0) return 0;
    return this.getTotalSpent() / parcelsWithFees.length;
  }

  getMonthlySpent(): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return this.sentParcels
      .filter(parcel => {
        if (!parcel.deliveryFee || !parcel.createdAt) return false;
        const parcelDate = new Date(parcel.createdAt);
        return parcelDate.getMonth() === currentMonth && 
               parcelDate.getFullYear() === currentYear;
      })
      .reduce((sum, parcel) => sum + (parcel.deliveryFee || 0), 0);
  }
} 