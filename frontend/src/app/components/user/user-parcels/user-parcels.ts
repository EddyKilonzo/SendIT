import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { BaseApiService, Parcel } from '../../../services/base-api.service';
import { ToastService } from '../../shared/toast/toast.service';

interface Notification {
  id: string;
  type: 'update' | 'delivered' | 'pending';
  message: string;
  date: string;
  icon: string;
}

@Component({
  selector: 'app-user-parcels',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent],
  templateUrl: './user-parcels.html',
  styleUrls: ['./user-parcels.css']
})
export class UserParcels implements OnInit {
  activeTab: 'sent' | 'received' = 'sent';
  
  // Filter states
  statusFilter: string = '';
  searchQuery: string = '';
  
  // Summary data
  totalParcelsSent = 0;
  totalParcelsReceived = 0;
  mostRecentShipment = '';
  mostRecentDelivery = '';
  
  // Real data
  sentParcels: Parcel[] = [];
  receivedParcels: Parcel[] = [];
  loading = false;

  notifications: Notification[] = [
    {
      id: '1',
      type: 'update',
      message: 'Your parcel #12345 is now in transit.',
      date: '2024-07-20',
      icon: 'fas fa-box'
    },
    {
      id: '2',
      type: 'delivered',
      message: 'Your parcel #67890 has been successfully delivered.',
      date: '2024-07-18',
      icon: 'fas fa-check'
    }
  ];

  // Filter options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'picked_up', label: 'Picked Up' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  constructor(
    private router: Router,
    private baseApiService: BaseApiService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadParcels();
  }

  async loadParcels() {
    this.loading = true;
    try {
      // Load sent parcels
      const sentResponse = await this.baseApiService.getUserParcels('sent').toPromise();
      this.sentParcels = sentResponse?.parcels || [];
      this.totalParcelsSent = this.sentParcels.length;
      
      // Load received parcels
      const receivedResponse = await this.baseApiService.getUserParcels('received').toPromise();
      this.receivedParcels = receivedResponse?.parcels || [];
      this.totalParcelsReceived = this.receivedParcels.length;
      
      // Calculate most recent dates
      this.calculateMostRecentDates();
      
    } catch (error) {
      console.error('Error loading parcels:', error);
      this.toastService.showError('Failed to load parcels. Please try again.');
      // Set default values on error
      this.sentParcels = [];
      this.receivedParcels = [];
      this.totalParcelsSent = 0;
      this.totalParcelsReceived = 0;
      this.mostRecentShipment = '';
      this.mostRecentDelivery = '';
    } finally {
      this.loading = false;
    }
  }

  calculateMostRecentDates() {
    // Most recent sent parcel
    if (this.sentParcels.length > 0) {
      const mostRecentSent = this.sentParcels
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      this.mostRecentShipment = new Date(mostRecentSent.createdAt).toISOString().split('T')[0];
    }

    // Most recent received parcel
    if (this.receivedParcels.length > 0) {
      const mostRecentReceived = this.receivedParcels
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      this.mostRecentDelivery = new Date(mostRecentReceived.createdAt).toISOString().split('T')[0];
    }
  }

  switchTab(tab: 'sent' | 'received') {
    this.activeTab = tab;
  }

  refreshParcels() {
    this.loadParcels();
  }

  clearFilters() {
    this.statusFilter = '';
    this.searchQuery = '';
  }

  viewParcelDetails(parcelId: string) {
    this.router.navigate(['/parcel-details', parcelId]);
  }

  getFilteredParcels(): Parcel[] {
    const parcels = this.activeTab === 'sent' ? this.sentParcels : this.receivedParcels;
    
    return parcels.filter(parcel => {
      // Status filter
      if (this.statusFilter && parcel.status !== this.statusFilter) {
        return false;
      }
      
      // Search filter
      if (this.searchQuery) {
        const query = this.searchQuery.toLowerCase();
        return (
          parcel.trackingNumber.toLowerCase().includes(query) ||
          parcel.pickupAddress.toLowerCase().includes(query) ||
          parcel.deliveryAddress.toLowerCase().includes(query) ||
          parcel.senderName.toLowerCase().includes(query) ||
          parcel.recipientName.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'assigned': return 'status-pending';
      case 'picked_up': return 'status-transit';
      case 'in_transit': return 'status-transit';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getNotificationIcon(notification: Notification): string {
    return notification.icon;
  }

  getNotificationClass(notification: Notification): string {
    switch (notification.type) {
      case 'update': return 'notification-update';
      case 'delivered': return 'notification-delivered';
      case 'pending': return 'notification-pending';
      default: return '';
    }
  }

  getCurrentTotalParcels(): number {
    return this.activeTab === 'sent' ? this.totalParcelsSent : this.totalParcelsReceived;
  }

  getCurrentMostRecentDate(): string {
    return this.activeTab === 'sent' ? this.mostRecentShipment : this.mostRecentDelivery;
  }
} 