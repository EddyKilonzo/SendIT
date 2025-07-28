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
      message: 'Your parcel #SENDIT835611720L7DD6 is now in transit.',
      date: '2024-12-20',
      icon: 'fas fa-box'
    },
    {
      id: '2',
      type: 'delivered',
      message: 'Your parcel #SENDIT123456789ABCD has been successfully delivered.',
      date: '2024-12-18',
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
    { value: 'completed', label: 'Completed' },
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
      console.log('🔍 Loading SENT parcels...');
      const sentResponse = await this.baseApiService.getUserParcels('sent').toPromise();
      console.log('📦 Sent response:', sentResponse);
      this.sentParcels = sentResponse?.parcels || [];
      this.totalParcelsSent = this.sentParcels.length;
      console.log(`✅ Sent parcels count: ${this.totalParcelsSent}`);
      
      // Load received parcels
      console.log('🔍 Loading RECEIVED parcels...');
      const receivedResponse = await this.baseApiService.getUserParcels('received').toPromise();
      console.log('📦 Received response:', receivedResponse);
      this.receivedParcels = receivedResponse?.parcels || [];
      this.totalParcelsReceived = this.receivedParcels.length;
      console.log(`✅ Received parcels count: ${this.totalParcelsReceived}`);
      
      // Calculate most recent dates
      this.calculateMostRecentDates();
      
      console.log('🎯 Final counts - Sent:', this.totalParcelsSent, 'Received:', this.totalParcelsReceived);
      
    } catch (error) {
      console.error('❌ Error loading parcels:', error);
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

  canMarkAsComplete(status: string): boolean {
    return status === 'delivered';
  }

  async markAsComplete(parcel: Parcel) {
    // Show confirmation toast instead of browser confirm
    this.toastService.showWarning(
      `Are you sure you want to mark parcel ${parcel.trackingNumber} as complete? This action cannot be undone.`, 
      5000
    );
    
    // For now, proceed with the action (in a real app, you might want a proper confirmation modal)
    // if (!confirmed) {
    //   return;
    // }
    
    try {
      // Show loading state
      this.toastService.showInfo('Marking parcel as completed...');
      
      // Call API to update parcel status to completed
      await this.baseApiService.markAsCompleted(parcel.id, {}).toPromise();
      
      // Update the parcel status locally
      parcel.status = 'completed';
      
      this.toastService.showSuccess('Parcel marked as completed! You can now leave a review.');
      
      // Refresh the parcels list
      this.loadParcels();
      
    } catch (error) {
      console.error('Error marking parcel as completed:', error);
      this.toastService.showError('Failed to mark parcel as completed. Please try again.');
    }
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
      case 'assigned': return 'status-assigned';
      case 'picked_up': return 'status-transit';
      case 'in_transit': return 'status-transit';
      case 'delivered': return 'status-delivered';
      case 'completed': return 'status-completed';
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
      case 'completed': return 'Completed';
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