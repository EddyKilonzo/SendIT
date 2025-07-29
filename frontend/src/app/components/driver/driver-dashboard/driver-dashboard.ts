import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { ParcelsService } from '../../../services/parcels.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

interface PerformanceMetrics {
  averageRating: number;
  deliveriesCompleted: number;
  totalDeliveries: number;
  inTransitDeliveries: number;
  pendingDeliveries: number;
  ratingChange: number;
  deliveriesChange: number;
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
  
  isLoading: boolean = false;
  isLoadingMetrics: boolean = false;

  performanceMetrics: PerformanceMetrics = {
    averageRating: 0,
    deliveriesCompleted: 0,
    totalDeliveries: 0,
    inTransitDeliveries: 0,
    pendingDeliveries: 0,
    ratingChange: 0,
    deliveriesChange: 0
  };

  constructor(
    private authService: AuthService,
    private parcelsService: ParcelsService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadDriverData();
  }

  loadDriverData() {
    this.isLoading = true;
    this.isLoadingMetrics = true;

    // Load performance metrics
    this.parcelsService.getDriverPerformanceMetrics().subscribe({
      next: (metrics) => {
        this.performanceMetrics = {
          averageRating: metrics.averageRating || 0,
          deliveriesCompleted: metrics.completedDeliveries || 0,
          totalDeliveries: metrics.totalDeliveries || 0,
          inTransitDeliveries: metrics.inTransitDeliveries || 0,
          pendingDeliveries: metrics.pendingDeliveries || 0,
          ratingChange: metrics.ratingChange || 0,
          deliveriesChange: metrics.deliveriesChange || 0
        };
        this.isLoadingMetrics = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading performance metrics:', error);
        this.isLoadingMetrics = false;
        this.isLoading = false;
      }
    });
  }

  getFormattedRating(): string {
    return `${this.performanceMetrics.averageRating}/5`;
  }

  getFormattedDeliveries(): string {
    return this.performanceMetrics.deliveriesCompleted.toString();
  }




}
