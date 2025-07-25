import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService, DashboardStats, SystemStats, Review, Driver, AnalyticsData } from '../../../services/admin.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService
  ) {}
  
  userRole: string = 'ADMIN';
  currentUser: any = null;
  
  isMobileView: boolean = false;
  showMobileMenu: boolean = false;
  
  activeTab = 'overview'; 
  
  // Loading states
  isLoading = true;
  isLoadingAnalytics = false;
  
  // Dashboard metrics from real data
  dashboardStats: DashboardStats | null = null;
  systemStats: SystemStats | null = null;
 
  // Delivery status data
  deliveryStatus = {
    total: 0,
    delivered: 0,
    inProgress: 0,
    pending: 0
  };

  // Average delivery time data
  deliveryTime = {
    average: 0,
    weeklyData: [0, 0, 0, 0] // Heights for the line chart
  };

  // Analytics Data - will be populated from real API
  analyticsData: AnalyticsData = {
    revenueTrends: {
      currentMonth: 0,
      previousMonth: 0,
      growth: '0%',
      monthlyData: [],
      dailyData: []
    },
    deliveryPerformance: {
      totalDeliveries: 0,
      onTimeDeliveries: 0,
      lateDeliveries: 0,
      failedDeliveries: 0,
      onTimeRate: 0,
      averageDeliveryTime: 0,
      performanceByDriver: [],
      performanceByVehicle: [],
      deliveryTimeTrends: []
    },
    customerReviews: {
      overallRating: 0,
      totalReviews: 0,
      ratingDistribution: [],
      recentReviews: [],
      satisfactionTrends: [],
      feedbackCategories: []
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
    if (tab === 'analytics' && !this.isLoadingAnalytics) {
      this.loadAnalyticsData();
    }
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
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
    this.currentUser = this.authService.getCurrentUser();
    this.checkMobileView();
    this.loadDashboardData();
    
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

  // Load dashboard data from API
  private loadDashboardData(): void {
    this.isLoading = true;
    
    forkJoin({
      dashboardStats: this.adminService.getDashboardStats().pipe(
        catchError(error => {
          console.error('Error loading dashboard stats:', error);
          return of(null);
        })
      ),
      systemStats: this.adminService.getSystemStats().pipe(
        catchError(error => {
          console.error('Error loading system stats:', error);
          return of(null);
        })
      )
    }).subscribe({
      next: (data) => {
        this.dashboardStats = data.dashboardStats;
        this.systemStats = data.systemStats;
        
        // Update delivery status
        if (this.dashboardStats) {
          this.deliveryStatus = {
            total: this.dashboardStats.totalParcels,
            delivered: this.dashboardStats.deliveredParcels,
            inProgress: this.dashboardStats.inTransitParcels,
            pending: this.dashboardStats.pendingParcels
          };
        }
        
        // Update delivery time
        if (this.systemStats) {
          this.deliveryTime = {
            average: this.systemStats.averageDeliveryTime,
            weeklyData: [40, 60, 30, 50] // This could be calculated from real data
          };
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.isLoading = false;
      }
    });
  }

  // Load analytics data from API
  private loadAnalyticsData(): void {
    this.isLoadingAnalytics = true;
    
    this.adminService.getAnalyticsData().pipe(
      catchError(error => {
        console.error('Error loading analytics data:', error);
        return of(null);
      })
    ).subscribe({
      next: (data) => {
        if (data) {
          this.analyticsData = data;
        }
        this.isLoadingAnalytics = false;
      },
      error: (error) => {
        console.error('Error loading analytics data:', error);
        this.isLoadingAnalytics = false;
      }
    });
  }

  // Helper method to calculate maximum revenue for chart scaling
  getMaxRevenue(): number {
    if (!this.analyticsData.revenueTrends.monthlyData || this.analyticsData.revenueTrends.monthlyData.length === 0) {
      return 1; // Prevent division by zero
    }
    return Math.max(...this.analyticsData.revenueTrends.monthlyData.map((d: { revenue: number }) => d.revenue));
  }

  // Helper method to calculate chart bar height
  getChartBarHeight(revenue: number): string {
    const maxRevenue = this.getMaxRevenue();
    const height = (revenue / maxRevenue) * 200;
    return height + 'px';
  }
}
