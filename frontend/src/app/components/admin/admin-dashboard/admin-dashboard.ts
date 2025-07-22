import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit, OnDestroy {
  constructor(private router: Router) {}
  
  userRole: string = 'ADMIN';
  
  isMobileView: boolean = false;
  showMobileMenu: boolean = false;
  
  activeTab = 'overview'; 
  
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

  // Analytics Data
  analyticsData = {
    // Revenue Trends Data
    revenueTrends: {
      currentMonth: 57544,
      previousMonth: 52340,
      growth: '+9.9%',
      monthlyData: [
        { month: 'Jan', revenue: 42000 },
        { month: 'Feb', revenue: 45000 },
        { month: 'Mar', revenue: 48000 },
        { month: 'Apr', revenue: 52000 },
        { month: 'May', revenue: 49000 },
        { month: 'Jun', revenue: 57544 },
        { month: 'Jul', revenue: 52000 },
        { month: 'Aug', revenue: 55000 },
        { month: 'Sep', revenue: 58000 },
        { month: 'Oct', revenue: 62000 },
        { month: 'Nov', revenue: 65000 },
        { month: 'Dec', revenue: 68000 }
      ],
      dailyData: [
        { day: 'Mon', revenue: 8200 },
        { day: 'Tue', revenue: 9100 },
        { day: 'Wed', revenue: 7800 },
        { day: 'Thu', revenue: 9500 },
        { day: 'Fri', revenue: 10200 },
        { day: 'Sat', revenue: 8800 },
        { day: 'Sun', revenue: 3944 }
      ]
    },

    // Delivery Performance Data
    deliveryPerformance: {
      totalDeliveries: 1200,
      onTimeDeliveries: 1080,
      lateDeliveries: 96,
      failedDeliveries: 24,
      onTimeRate: 90.0,
      averageDeliveryTime: 2.5,
      performanceByDriver: [
        { name: 'John Doe', deliveries: 45, onTimeRate: 95.6, rating: 4.8 },
        { name: 'Jane Smith', deliveries: 38, onTimeRate: 92.1, rating: 4.6 },
        { name: 'Mike Johnson', deliveries: 42, onTimeRate: 88.1, rating: 4.6 },
        { name: 'Sarah Wilson', deliveries: 35, onTimeRate: 94.3, rating: 4.7 },
        { name: 'David Brown', deliveries: 40, onTimeRate: 90.0, rating: 4.5 }
      ],
      performanceByVehicle: [
        { type: 'Motorcycle', deliveries: 480, efficiency: 85.2 },
        { type: 'Car', deliveries: 420, efficiency: 92.1 },
        { type: 'Van', deliveries: 240, efficiency: 88.5 },
        { type: 'Truck', deliveries: 60, efficiency: 95.0 }
      ],
      deliveryTimeTrends: [
        { week: 'Week 1', avgTime: 2.8 },
        { week: 'Week 2', avgTime: 2.6 },
        { week: 'Week 3', avgTime: 2.4 },
        { week: 'Week 4', avgTime: 2.5 }
      ]
    },

    // Customer Reviews & Satisfaction Data
    customerReviews: {
      overallRating: 4.6,
      totalReviews: 856,
      ratingDistribution: [
        { stars: 5, count: 428, percentage: 50.0 },
        { stars: 4, count: 257, percentage: 30.0 },
        { stars: 3, count: 86, percentage: 10.0 },
        { stars: 2, count: 43, percentage: 5.0 },
        { stars: 1, count: 42, percentage: 5.0 }
      ],
      recentReviews: [
        {
          id: 1,
          customerName: 'Alice Johnson',
          rating: 5,
          comment: 'Excellent service! My package was delivered on time and in perfect condition.',
          date: '2024-01-15',
          driverName: 'John Doe'
        },
        {
          id: 2,
          customerName: 'Bob Wilson',
          rating: 4.5,
          comment: 'Good delivery service. Driver was professional and courteous.',
          date: '2024-01-14',
          driverName: 'Jane Smith'
        },
        {
          id: 3,
          customerName: 'Carol Davis',
          rating: 5,
          comment: 'Amazing experience! Fast delivery and great communication throughout.',
          date: '2024-01-13',
          driverName: 'Mike Johnson'
        },
        {
          id: 4,
          customerName: 'David Miller',
          rating: 3,
          comment: 'Delivery was a bit late but package arrived safely.',
          date: '2024-01-12',
          driverName: 'Sarah Wilson'
        },
        {
          id: 5,
          customerName: 'Eva Garcia',
          rating: 5,
          comment: 'Outstanding service! Will definitely use again.',
          date: '2024-01-11',
          driverName: 'David Brown'
        }
      ],
      satisfactionTrends: [
        { month: 'Jan', rating: 4.4 },
        { month: 'Feb', rating: 4.5 },
        { month: 'Mar', rating: 4.3 },
        { month: 'Apr', rating: 4.6 },
        { month: 'May', rating: 4.5 },
        { month: 'Jun', rating: 4.6 }
      ],
      feedbackCategories: [
        { category: 'Delivery Speed', positive: 78, neutral: 15, negative: 7 },
        { category: 'Driver Courtesy', positive: 92, neutral: 6, negative: 2 },
        { category: 'Package Condition', positive: 95, neutral: 4, negative: 1 },
        { category: 'Communication', positive: 85, neutral: 12, negative: 3 }
      ]
    }
  };

  menuItems = [
    { icon: 'fas fa-home', label: 'Dashboard', active: true },
    { icon: 'fas fa-plus', label: 'Create Delivery', active: false },
    { icon: 'fas fa-box', label: 'Manage Parcels', active: false },
    { icon: 'fas fa-users', label: 'Users', active: false }
  ];

  sidebarOpen = true;

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  createDelivery() {
    console.log('Create Delivery clicked');
    // Add navigation logic here
  }

  manageParcels() {
    console.log('Manage Parcels clicked');
    
  }

  logout() {
    console.log('Logout clicked');
    
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#28a745';
    if (rating >= 4.0) return '#ffc107';
    if (rating >= 3.0) return '#fd7e14';
    return '#dc3545';
  }

  getPerformanceColor(rate: number): string {
    if (rate >= 90) return '#28a745';
    if (rate >= 80) return '#ffc107';
    if (rate >= 70) return '#fd7e14';
    return '#dc3545';
  }

  formatCurrency(amount: number): string {
    return `KSH ${amount.toLocaleString()}`;
  }

  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  round(value: number): number {
    return Math.round(value);
  }

  ngOnInit(): void {
    this.checkMobileView();
    
    // Listen for window resize events
    window.addEventListener('resize', () => {
      this.checkMobileView();
    });
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    window.removeEventListener('resize', () => {
      this.checkMobileView();
    });
  }

  checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    // Prevent body scroll when menu is open
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }
}
