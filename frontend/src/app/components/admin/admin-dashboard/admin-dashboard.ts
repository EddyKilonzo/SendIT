import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard {
  constructor(private router: Router) {}
  // Dashboard metrics matching the image
  dashboardStats = {
    totalParcels: 1200,
    deliveriesInProgress: 30,
    revenue: 57544
  };

  // Delivery status data
  deliveryStatus = {
    total: 120,
    delivered: 70,
    inProgress: 20,
    pending: 10
  };

  // Average delivery time data
  deliveryTime = {
    average: 2.5,
    weeklyData: [40, 60, 30, 50] // Heights for the line chart
  };

  // Navigation menu
  menuItems = [
    { icon: 'fas fa-home', label: 'Dashboard', active: true },
    { icon: 'fas fa-plus', label: 'Create Delivery', active: false },
    { icon: 'fas fa-box', label: 'Manage Parcels', active: false },
    { icon: 'fas fa-users', label: 'Users', active: false }
  ];

  

  // Toggle sidebar
  sidebarOpen = true;

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  // Quick action handlers
  createDelivery() {
    console.log('Create Delivery clicked');
    // Add navigation logic here
  }

  manageParcels() {
    console.log('Manage Parcels clicked');
    
  }

  // Logout handler
  logout() {
    console.log('Logout clicked');
    
  }
}
