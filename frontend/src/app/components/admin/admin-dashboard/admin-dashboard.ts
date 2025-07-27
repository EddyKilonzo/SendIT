import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { AdminService, DashboardStats, SystemStats, Driver, Review, AnalyticsData } from '../../../services/admin.service';
import { ToastService } from '../../shared/toast/toast.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SidebarComponent
  ],
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css']
})
export class AdminDashboard implements OnInit, OnDestroy {
  constructor(
    private router: Router,
    private authService: AuthService,
    private adminService: AdminService,
    private toastService: ToastService
  ) {}

  userRole: string = 'ADMIN';
  currentUser: any = null;

  isMobileView: boolean = false;
  showMobileMenu: boolean = false;

  activeTab = 'overview'; 
  chartPeriod = 'monthly'; // 'monthly' or 'weekly'

  isLoading = true;
  isLoadingAnalytics = false;

  dashboardStats: DashboardStats | null = null;
  systemStats: SystemStats | null = null;

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

  topDrivers: Driver[] = [];

  selectedRatingFilter: number = 0; // 0 = all, 1-5 = specific rating
  filteredReviews: Review[] = [];
  currentReviewPage: number = 1;
  reviewsPerPage: number = 3;

  menuItems = [
    { label: 'Dashboard', icon: 'fas fa-tachometer-alt', route: '/admin/dashboard' },
    { label: 'Create Delivery', icon: 'fas fa-plus', route: '/admin/create-delivery' },
    { label: 'Manage Parcels', icon: 'fas fa-box', route: '/admin/manage-parcels' },
    { label: 'Manage Users', icon: 'fas fa-users', route: '/admin/manage-users' }
  ];

  sidebarOpen = true;

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  createDelivery() {
    this.router.navigate(['/admin', 'create-delivery']);
  }

  manageParcels() {
    this.router.navigate(['/admin', 'manage-parcels']);
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  switchTab(tab: string) {
    this.activeTab = tab;
  }

  switchChartPeriod(period: string) {
    this.chartPeriod = period;
  }

  getRatingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  getRatingColor(rating: number): string {
    if (rating >= 4.5) return '#10B981';
    if (rating >= 4.0) return '#3B82F6';
    if (rating >= 3.0) return '#F59E0B';
    return '#EF4444';
  }

  getPerformanceColor(rate: number): string {
    if (rate >= 90) return '#10B981';
    if (rate >= 80) return '#3B82F6';
    if (rate >= 70) return '#F59E0B';
    return '#EF4444';
  }

  formatCurrency(amount: number): string {
    if (amount === 0 || amount === null || amount === undefined) {
      return 'KSH 0.00';
    }
    return `KSH ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
    this.loadAnalyticsData();
    
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
      next: (data: { dashboardStats: DashboardStats | null; systemStats: SystemStats | null }) => {
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
            weeklyData: this.calculateWeeklyDeliveryData()
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
    console.log('🔍 Loading analytics data...');
    
    this.adminService.getAnalyticsData().pipe(
      catchError(error => {
        console.error('❌ Error loading analytics data:', error);
        this.isLoadingAnalytics = false;
        this.toastService.showError('Failed to load analytics data');
        return of(null);
      })
    ).subscribe({
      next: (data: AnalyticsData | null) => {
        console.log('📊 Analytics API response:', data);
        
        if (data) {
          
          // Ensure the data structure matches what the frontend expects
          const processedData = {
            revenueTrends: {
              currentMonth: data.revenueTrends?.currentMonth || 0,
              previousMonth: data.revenueTrends?.previousMonth || 0,
              growth: data.revenueTrends?.growth || '0%',
              monthlyData: data.revenueTrends?.monthlyData || [],
              dailyData: data.revenueTrends?.dailyData || []
            },
            deliveryPerformance: {
              totalDeliveries: data.deliveryPerformance?.totalDeliveries || 0,
              onTimeDeliveries: data.deliveryPerformance?.onTimeDeliveries || 0,
              lateDeliveries: data.deliveryPerformance?.lateDeliveries || 0,
              failedDeliveries: data.deliveryPerformance?.failedDeliveries || 0,
              onTimeRate: data.deliveryPerformance?.onTimeRate || 0,
              averageDeliveryTime: data.deliveryPerformance?.averageDeliveryTime || 0,
              performanceByDriver: data.deliveryPerformance?.performanceByDriver || [],
              performanceByVehicle: data.deliveryPerformance?.performanceByVehicle || [],
              deliveryTimeTrends: data.deliveryPerformance?.deliveryTimeTrends || []
            },
            customerReviews: {
              overallRating: data.customerReviews?.overallRating || 0,
              totalReviews: data.customerReviews?.totalReviews || 0,
              ratingDistribution: data.customerReviews?.ratingDistribution || [],
              recentReviews: data.customerReviews?.recentReviews || [],
              satisfactionTrends: data.customerReviews?.satisfactionTrends || [],
              feedbackCategories: data.customerReviews?.feedbackCategories || []
            }
          };
          
          // Use processed data
          this.analyticsData = processedData;
          console.log('✅ Processed analytics data:', processedData);
          console.log('💰 Revenue data:', processedData.revenueTrends);
          console.log('📦 Reviews data:', processedData.customerReviews);
          
          // Populate top drivers from real data if available
          if (data.deliveryPerformance && data.deliveryPerformance.performanceByDriver && data.deliveryPerformance.performanceByDriver.length > 0) {
            this.topDrivers = data.deliveryPerformance.performanceByDriver
              .sort((a: Driver, b: Driver) => b.averageRating - a.averageRating)
              .slice(0, 3);
          } else {
            // Load real drivers from API if no analytics driver data
            this.loadTopDriversFromAPI();
          }
          
          // Initialize filtered reviews
          this.updateFilteredReviews();
        } else {
          console.log('⚠️ No analytics data received');
          this.isLoadingAnalytics = false;
        }
        this.isLoadingAnalytics = false;
      }
    });
  }

  private loadTopDriversFromAPI(): void {
    this.adminService.getDrivers({ limit: 3, sortBy: 'averageRating', sortOrder: 'desc' }).subscribe({
      next: (response: { drivers: Driver[]; total: number }) => {
        if (response.drivers && response.drivers.length > 0) {
          this.topDrivers = response.drivers;
        } else {
          // If no drivers from API, show empty state
          this.topDrivers = [];
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading top drivers:', error);
        this.topDrivers = [];
      }
    });
  }

  private calculateWeeklyDeliveryData(): number[] {
    // Calculate weekly delivery data from real analytics data
    if (this.analyticsData?.deliveryPerformance?.deliveryTimeTrends) {
      return this.analyticsData.deliveryPerformance.deliveryTimeTrends
        .slice(-4) // Get last 4 weeks
        .map(trend => trend.avgTime * 10); // Scale for chart display
    }
    
    // Fallback to calculated data based on system stats
    if (this.systemStats?.averageDeliveryTime) {
      const baseTime = this.systemStats.averageDeliveryTime;
      return [
        Math.round(baseTime * 0.9 * 10), // Week 1: 90% of average
        Math.round(baseTime * 1.1 * 10), // Week 2: 110% of average
        Math.round(baseTime * 0.95 * 10), // Week 3: 95% of average
        Math.round(baseTime * 1.05 * 10)  // Week 4: 105% of average
      ];
    }
    
    // Default fallback
    return [40, 60, 30, 50];
  }

  // Helper method to calculate maximum revenue for chart scaling
  getMaxRevenue(): number {
    const data = this.getChartData();
    
    if (!data || data.length === 0) {
      return 1; // Prevent division by zero
    }
    return Math.max(...data.map(d => d.revenue));
  }

  getChartData(): Array<{ revenue: number; label: string }> {
    if (this.chartPeriod === 'monthly') {
      return this.analyticsData.revenueTrends.monthlyData.map(item => ({
        revenue: item.revenue,
        label: item.month
      }));
    } else {
      return this.analyticsData.revenueTrends.dailyData.map(item => ({
        revenue: item.revenue,
        label: item.day
      }));
    }
  }

  // Helper method to calculate chart bar height
  getChartBarHeight(revenue: number): string {
    const maxRevenue = this.getMaxRevenue();
    const height = (revenue / maxRevenue) * 200;
    return height + 'px';
  }

  // Top drivers methods
  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    } else {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
  }

  getAvatarColor(name: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
    const avatarContainer = event.target.parentElement;
    const initialsDiv = avatarContainer.querySelector('.driver-initials, .reviewer-initials');
    if (initialsDiv) {
      initialsDiv.style.display = 'flex';
    }
  }

  viewDriverProfile(driverId: string): void {
    this.router.navigate(['/admin', 'user-details', driverId]);
  }

  viewUserProfile(userId: string): void {
    this.router.navigate(['/admin', 'user-details', userId]);
  }

  // Reviews filtering methods
  filterReviewsByRating(rating: number): void {
    this.selectedRatingFilter = rating;
    this.currentReviewPage = 1;
    this.updateFilteredReviews();
  }

  updateFilteredReviews(): void {
    if (this.selectedRatingFilter === 0) {
      this.filteredReviews = [...this.analyticsData.customerReviews.recentReviews];
    } else {
      this.filteredReviews = this.analyticsData.customerReviews.recentReviews.filter(
        review => review.rating === this.selectedRatingFilter
      );
    }
  }

  get totalReviewPages(): number {
    return Math.ceil(this.filteredReviews.length / this.reviewsPerPage);
  }

  previousReviewPage(): void {
    if (this.currentReviewPage > 1) {
      this.currentReviewPage--;
    }
  }

  nextReviewPage(): void {
    if (this.currentReviewPage < this.totalReviewPages) {
      this.currentReviewPage++;
      this.updateFilteredReviews();
    }
  }

  hasRevenueData(): boolean {
    const currentMonth = this.analyticsData.revenueTrends.currentMonth;
    const previousMonth = this.analyticsData.revenueTrends.previousMonth;
    return currentMonth > 0 || previousMonth > 0;
  }

  hasReviewsData(): boolean {
    const totalReviews = this.analyticsData.customerReviews.totalReviews;
    return totalReviews > 0;
  }
}
