import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../../shared/toast/toast.service';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'Driver' | 'User';
  status: 'Active' | 'Inactive' | 'Suspended';
  registered: string;
  avatar: string;
  address?: string;
  driverId?: string;
  vehicleType?: string;
  licensePlate?: string;
  startDate?: string;
  averageDeliveryTime?: string;
  customerRating?: string;
  totalSpent?: string;
}

interface Parcel {
  id: string;
  trackingNumber: string;
  status: 'In Transit' | 'Delivered' | 'Pending Pickup' | 'Cancelled';
  pickupDate: string;
  deliveryDate: string;
  weight: string;
  price: string;
  sender: string;
  receiver: string;
}

interface Activity {
  date: string;
  activity: string;
  details: string;
}

@Component({
  selector: 'app-user-details',
  templateUrl: './user-details.html',
  styleUrl: './user-details.css',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class UserDetails implements OnInit {
  activeTab = 'overview';
  user: User | null = null;
  assignedParcels: Parcel[] = [];
  userParcels: Parcel[] = [];
  userActivity: Activity[] = [];

  // Mock data for demonstration
  private mockUsers: User[] = [
    {
      id: '1',
      name: 'Sophia Bennett',
      email: 'sophia.bennett@email.com',
      phone: '+1-555-123-4567',
      role: 'User',
      status: 'Active',
      registered: '2023-01-15',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=entropy',
      address: '123 Elm Street, Anytown, USA',
      totalSpent: '$500'
    },
    {
      id: '2',
      name: 'Ethan Carter',
      email: 'ethan.carter@example.com',
      phone: '+1 (555) 123-4567',
      role: 'Driver',
      status: 'Active',
      registered: '2022-05-15',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=entropy',
      address: '123 Elm Street, Anytown, USA',
      driverId: 'DC4567',
      vehicleType: 'Van',
      licensePlate: 'ABC-123',
      startDate: '2022-05-15',
      averageDeliveryTime: '35 minutes',
      customerRating: '4.8/5'
    },
    {
      id: '3',
      name: 'Olivia Hayes',
      email: 'olivia.hayes@email.com',
      phone: '123-456-7892',
      role: 'User',
      status: 'Active',
      registered: '2023-09-13',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=entropy',
      address: '789 Pine Lane, Anytown, USA'
    },
    {
      id: '4',
      name: 'Liam Foster',
      email: 'liam.foster@email.com',
      phone: '123-456-7893',
      role: 'Driver',
      status: 'Active',
      registered: '2023-04-05',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=entropy',
      address: '101 Maple Drive, Anytown, USA',
      driverId: 'DC7890',
      vehicleType: 'Truck',
      licensePlate: 'XYZ-789',
      startDate: '2023-04-05',
      averageDeliveryTime: '42 minutes',
      customerRating: '4.6/5'
    }
  ];

  private mockParcels: Parcel[] = [
    {
      id: 'P12345',
      trackingNumber: 'TRK12345',
      status: 'In Transit',
      pickupDate: '2024-07-26',
      deliveryDate: '2024-07-28',
      weight: '2.5 kg',
      price: 'KSH 2,500',
      sender: 'John Doe',
      receiver: 'Jane Smith'
    },
    {
      id: 'P67890',
      trackingNumber: 'TRK67890',
      status: 'Delivered',
      pickupDate: '2024-07-25',
      deliveryDate: '2024-07-27',
      weight: '1.8 kg',
      price: 'KSH 1,800',
      sender: 'Alice Johnson',
      receiver: 'Bob Wilson'
    },
    {
      id: 'P11223',
      trackingNumber: 'TRK11223',
      status: 'Pending Pickup',
      pickupDate: '2024-07-27',
      deliveryDate: '2024-07-29',
      weight: '3.2 kg',
      price: 'KSH 3,200',
      sender: 'Charlie Brown',
      receiver: 'Diana Prince'
    }
  ];

  private mockUserParcels: Parcel[] = [
    {
      id: '789012',
      trackingNumber: 'TRK789012',
      status: 'Delivered',
      pickupDate: '2024-03-15',
      deliveryDate: '2024-03-17',
      weight: '1.5 kg',
      price: 'KSH 1,500',
      sender: 'Emma Davis',
      receiver: 'Frank Miller'
    },
    {
      id: '345678',
      trackingNumber: 'TRK345678',
      status: 'In Transit',
      pickupDate: '2024-03-10',
      deliveryDate: '2024-03-12',
      weight: '2.8 kg',
      price: 'KSH 2,800',
      sender: 'Grace Lee',
      receiver: 'Henry Taylor'
    }
  ];

  private mockUserActivity: Activity[] = [
    {
      date: '2024-03-15',
      activity: 'Parcel Sent',
      details: 'Tracking ID: 789012'
    },
    {
      date: '2024-03-10',
      activity: 'Parcel Received',
      details: 'Tracking ID: 345678'
    },
    {
      date: '2024-03-05',
      activity: 'Account Updated',
      details: 'Profile Information'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const userId = params['id'];
      this.loadUserDetails(userId);
      this.loadAssignedParcels(userId);
    });
  }

  loadUserDetails(userId: string) {
    this.user = this.mockUsers.find(user => user.id === userId) || null;
    if (!this.user) {
      // Handle user not found
      this.router.navigate(['/admin-manage-users']);
    }
  }

  loadAssignedParcels(userId: string) {
    // In a real application, this would fetch parcels assigned to the specific user/driver
    // For now, we'll show mock data for drivers
    const user = this.mockUsers.find(u => u.id === userId);
    if (user?.role === 'Driver') {
      this.assignedParcels = this.mockParcels;
      this.userParcels = [];
      this.userActivity = [];
    } else {
      this.assignedParcels = [];
      this.userParcels = this.mockUserParcels;
      this.userActivity = this.mockUserActivity;
    }
  }

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  getTimeSinceJoined(registeredDate: string): string {
    const registered = new Date(registeredDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - registered.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months !== 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} year${years !== 1 ? 's' : ''} ago`;
    }
  }

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(' ', '-');
  }

  viewParcelDetails(parcelId: string) {
    this.router.navigate(['/admin-parcel-details', parcelId]);
  }

  getRatingStars(rating?: number): string {
    if (!rating) return 'Not rated';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  updateUserStatus(userId: string, newStatus: 'Active' | 'Inactive' | 'Suspended') {
    // In a real application, this would make an API call to update the user status
    if (this.user) {
      this.user.status = newStatus;
    }
    
    // Update the mock data as well
    const userIndex = this.mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      this.mockUsers[userIndex].status = newStatus;
    }
  }

  showStatusModal = false;
  selectedStatus: 'Active' | 'Inactive' | 'Suspended' = 'Active';

  openStatusModal() {
    this.selectedStatus = this.user?.status || 'Active';
    this.showStatusModal = true;
    
    // Show info toast message
    if (this.user) {
      this.toastService.showInfo(
        `Managing status for ${this.user.name} (${this.user.role})`,
        3000
      );
    }
  }

  closeStatusModal() {
    this.showStatusModal = false;
    
    // Show warning toast message if status was changed but not confirmed
    if (this.user && this.selectedStatus !== this.user.status) {
      this.toastService.showWarning(
        'Status change was cancelled. No changes were made.',
        3000
      );
    }
  }

  confirmStatusUpdate() {
    if (this.user) {
      const previousStatus = this.user.status;
      this.updateUserStatus(this.user.id, this.selectedStatus);
      this.closeStatusModal();
      
      // Show success toast message
      const statusText = this.selectedStatus.toLowerCase();
      const userName = this.user.name;
      this.toastService.showSuccess(
        `${userName}'s account has been ${statusText === 'active' ? 'activated' : statusText === 'inactive' ? 'deactivated' : 'suspended'} successfully.`,
        4000
      );
    }
  }
} 