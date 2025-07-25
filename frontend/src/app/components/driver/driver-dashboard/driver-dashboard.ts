import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

interface Delivery {
  id: string;
  parcelId: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledTime: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
  customerName?: string;
  customerPhone?: string;
  specialInstructions?: string;
}

interface PerformanceMetrics {
  averageRating: number;
  deliveriesCompleted: number;
  onTimeDeliveryRate: number;
  ratingChange: number;
  deliveriesChange: number;
  onTimeChange: number;
}

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './driver-dashboard.html',
  styleUrls: ['./driver-dashboard.css']
})
export class DriverDashboard implements OnInit {
  // User role for role-based access control
  userRole: string = 'DRIVER'; // Default role for driver
  currentUser: any = null; 
  
  todayDeliveries: Delivery[] = [
    {
      id: '1',
      parcelId: '#12345',
      pickupAddress: '123 Elm Street, Anytown',
      deliveryAddress: '456 Oak Avenue, Anytown',
      scheduledTime: '10:00 AM',
      status: 'In Transit',
      customerName: 'John Smith',
      customerPhone: '+1-555-123-4567',
      specialInstructions: 'Please call before delivery'
    },
    {
      id: '2',
      parcelId: '#67890',
      pickupAddress: '789 Pine Lane, Anytown',
      deliveryAddress: '101 Maple Drive, Anytown',
      scheduledTime: '11:30 AM',
      status: 'Pending',
      customerName: 'Jane Doe',
      customerPhone: '+1-555-987-6543',
      specialInstructions: 'Leave at front door if no answer'
    },
    {
      id: '3',
      parcelId: '#24680',
      pickupAddress: '222 Cedar Road, Anytown',
      deliveryAddress: '333 Birch Court, Anytown',
      scheduledTime: '1:00 PM',
      status: 'Pending',
      customerName: 'Mike Johnson',
      customerPhone: '+1-555-456-7890',
      specialInstructions: 'Ring doorbell twice'
    }
  ];

  performanceMetrics: PerformanceMetrics = {
    averageRating: 4.8,
    deliveriesCompleted: 150,
    onTimeDeliveryRate: 95,
    ratingChange: 0.2,
    deliveriesChange: 10,
    onTimeChange: 5
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadTodayDeliveries();
    this.loadPerformanceMetrics();
  }

  loadTodayDeliveries() {
    // This would typically load from a service
    console.log('Loading today\'s deliveries...');
  }

  loadPerformanceMetrics() {
    // This would typically load from a service
    console.log('Loading performance metrics...');
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

  viewDeliveryDetails(deliveryId: string) {
    this.router.navigate(['/driver-delivery-details', deliveryId]);
  }

  startDelivery(deliveryId: string) {
    console.log('Starting delivery:', deliveryId);
    // This would update the delivery status to 'In Transit'
  }

  completeDelivery(deliveryId: string) {
    console.log('Completing delivery:', deliveryId);
    // This would update the delivery status to 'Delivered'
  }

  getFormattedRating(): string {
    return `${this.performanceMetrics.averageRating}/5`;
  }

  getFormattedDeliveries(): string {
    return this.performanceMetrics.deliveriesCompleted.toString();
  }

  getFormattedOnTimeRate(): string {
    return `${this.performanceMetrics.onTimeDeliveryRate}%`;
  }
}
