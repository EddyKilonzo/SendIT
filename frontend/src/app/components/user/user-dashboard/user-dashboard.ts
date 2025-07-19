import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './user-dashboard.html',
  styleUrls: ['./user-dashboard.css']
})
export class UserDashboard implements OnInit {
  userName = 'Sophia';
  parcelsInTransit = 2;
  scheduledForTomorrow = 1;
  
  recentActivities: Activity[] = [
    {
      parcelId: '#12345',
      status: 'In Transit',
      date: '2024-07-20',
      icon: 'fas fa-truck'
    },
    {
      parcelId: '#67890',
      status: 'Delivered',
      date: '2024-07-15',
      icon: 'fas fa-check'
    },
    {
      parcelId: '#11223',
      status: 'Pending',
      date: '2024-07-22',
      icon: 'fas fa-clock'
    }
  ];

  summaryCards: SummaryCard[] = [
    {
      title: 'Parcels Sent',
      value: 15,
      icon: 'fas fa-paper-plane'
    },
    {
      title: 'Parcels Received',
      value: 20,
      icon: 'fas fa-inbox'
    },
    {
      title: 'Total Spent',
      value: 'ksh3050',
      icon: 'fas fa-dollar-sign'
    }
  ];

  sentParcels: Parcel[] = [
    {
      id: '#12345',
      weight: 2,
      status: 'In Transit',
      pickupAddress: '123 Oak Street, Anytown',
      deliveryAddress: '456 Maple Avenue, Anytown',
      expectedDelivery: '2024-07-20',
      type: 'sent'
    },
    {
      id: '#11223',
      weight: 3,
      status: 'Pending',
      pickupAddress: '222 Cedar Drive, Anytown',
      deliveryAddress: '333 Birch Court, Anytown',
      expectedDelivery: '2024-07-22',
      scheduledPickup: '2024-07-22',
      type: 'sent'
    },
    {
      id: '#44556',
      weight: 1.8,
      status: 'Cancelled',
      pickupAddress: '444 Spruce Way, Anytown',
      deliveryAddress: '555 Willow Path, Anytown',
      expectedDelivery: '2024-07-18',
      type: 'sent'
    }
  ];

  receivedParcels: Parcel[] = [
    {
      id: '#67890',
      weight: 1.5,
      status: 'Delivered',
      pickupAddress: '789 Pine Lane, Anytown',
      deliveryAddress: '101 Elm Road, Anytown',
      expectedDelivery: '2024-07-15',
      deliveredDate: '2024-07-15',
      type: 'received'
    },
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
    }
  ];

  activeTab: 'sent' | 'received' = 'sent';
  totalParcels = 35;
  growthPercentage = 10;

  constructor() {}

  ngOnInit() {
    // Initialize dashboard data
  }

  switchTab(tab: 'sent' | 'received') {
    this.activeTab = tab;
  }

  getRecentParcels(): Parcel[] {
    return this.activeTab === 'sent' ? this.sentParcels : this.receivedParcels;
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
} 