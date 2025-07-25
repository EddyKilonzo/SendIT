import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

interface Parcel {
  id: string;
  weight: number;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
  pickupAddress: string;
  deliveryAddress: string;
  expectedDelivery: string;
  deliveredDate?: string;
  scheduledPickup?: string;
  type: 'sent' | 'received';
}

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
  totalParcelsSent = 5;
  mostRecentShipment = '2024-07-20';
  
  // Sample data
  sentParcels: Parcel[] = [
    {
      id: '#12345',
      weight: 2,
      status: 'In Transit',
      pickupAddress: '123 Maple Street, Anytown',
      deliveryAddress: '456 Oak Avenue, Anytown',
      expectedDelivery: '2024-07-20',
      type: 'sent'
    },
    {
      id: '#11223',
      weight: 3,
      status: 'Pending',
      pickupAddress: '322 Cedar Drive, Anytown',
      deliveryAddress: '333 Birch Court, Anytown',
      expectedDelivery: '2024-07-22',
      scheduledPickup: '2024-07-22',
      type: 'sent'
    },
    {
      id: '#44508',
      weight: 2.5,
      status: 'In Transit',
      pickupAddress: '444 Spruce Way, Anytown',
      deliveryAddress: '555 Willow Place, Anytown',
      expectedDelivery: '2024-07-21',
      type: 'sent'
    },
    {
      id: '#77889',
      weight: 1,
      status: 'Delivered',
      pickupAddress: '890 Aspen Circle, Anytown',
      deliveryAddress: '777 Redwood Boulevard, Anytown',
      expectedDelivery: '2024-07-18',
      deliveredDate: '2024-07-18',
      type: 'sent'
    },
    {
      id: '#67890',
      weight: 1.5,
      status: 'Delivered',
      pickupAddress: '789 Pine Lane, Anytown',
      deliveryAddress: '101 Elm Road, Anytown',
      expectedDelivery: '2024-07-18',
      deliveredDate: '2024-07-18',
      type: 'sent'
    }
  ];

  receivedParcels: Parcel[] = [
    {
      id: '#99887',
      weight: 2.5,
      status: 'Delivered',
      pickupAddress: '666 Oak Drive, Anytown',
      deliveryAddress: '777 Maple Street, Anytown',
      expectedDelivery: '2024-07-10',
      deliveredDate: '2024-07-10',
      type: 'received'
    },
    {
      id: '#55443',
      weight: 0.8,
      status: 'Delivered',
      pickupAddress: '111 Cedar Lane, Anytown',
      deliveryAddress: '222 Birch Road, Anytown',
      expectedDelivery: '2024-07-05',
      deliveredDate: '2024-07-05',
      type: 'received'
    },
    {
      id: '#33221',
      weight: 1.2,
      status: 'Delivered',
      pickupAddress: '333 Pine Avenue, Anytown',
      deliveryAddress: '444 Elm Lane, Anytown',
      expectedDelivery: '2024-07-01',
      deliveredDate: '2024-07-01',
      type: 'received'
    }
  ];

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
    { value: 'Pending', label: 'Pending' },
    { value: 'In Transit', label: 'In Transit' },
    { value: 'Delivered', label: 'Delivered' },
    { value: 'Cancelled', label: 'Cancelled' }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    // Initialize component
  }

  switchTab(tab: 'sent' | 'received') {
    this.activeTab = tab;
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
          parcel.id.toLowerCase().includes(query) ||
          parcel.pickupAddress.toLowerCase().includes(query) ||
          parcel.deliveryAddress.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'In Transit': return 'status-transit';
      case 'Delivered': return 'status-delivered';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
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
} 