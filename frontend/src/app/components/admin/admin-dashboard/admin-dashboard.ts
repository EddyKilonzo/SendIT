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
  
  // Chart period state
  chartPeriod = 'monthly'; // 'monthly' or 'weekly'
  
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
      currentMonth: 125000,
      previousMonth: 98000,
      growth: '+27.6%',
      monthlyData: [
        { month: 'Jan', revenue: 85000 },
        { month: 'Feb', revenue: 92000 },
        { month: 'Mar', revenue: 88000 },
        { month: 'Apr', revenue: 95000 },
        { month: 'May', revenue: 102000 },
        { month: 'Jun', revenue: 98000 },
        { month: 'Jul', revenue: 110000 },
        { month: 'Aug', revenue: 118000 },
        { month: 'Sep', revenue: 125000 },
        { month: 'Oct', revenue: 132000 },
        { month: 'Nov', revenue: 128000 },
        { month: 'Dec', revenue: 135000 }
      ],
      dailyData: [
        { day: 'Mon', revenue: 4500 },
        { day: 'Tue', revenue: 5200 },
        { day: 'Wed', revenue: 4800 },
        { day: 'Thu', revenue: 5500 },
        { day: 'Fri', revenue: 5800 },
        { day: 'Sat', revenue: 4200 },
        { day: 'Sun', revenue: 3800 }
      ]
    },
    deliveryPerformance: {
      totalDeliveries: 1250,
      onTimeDeliveries: 1180,
      lateDeliveries: 45,
      failedDeliveries: 25,
      onTimeRate: 94.4,
      averageDeliveryTime: 2.8,
      performanceByDriver: [],
      performanceByVehicle: [
        { type: 'Motorcycle', deliveries: 850, efficiency: 96 },
        { type: 'Car', deliveries: 320, efficiency: 92 },
        { type: 'Van', deliveries: 80, efficiency: 88 }
      ],
      deliveryTimeTrends: [
        { week: 'Week 1', avgTime: 2.5 },
        { week: 'Week 2', avgTime: 2.8 },
        { week: 'Week 3', avgTime: 2.6 },
        { week: 'Week 4', avgTime: 2.9 }
      ]
    },
    customerReviews: {
      overallRating: 4.6,
      totalReviews: 342,
      ratingDistribution: [
        { stars: 5, count: 180, percentage: 52.6 },
        { stars: 4, count: 95, percentage: 27.8 },
        { stars: 3, count: 45, percentage: 13.2 },
        { stars: 2, count: 15, percentage: 4.4 },
        { stars: 1, count: 7, percentage: 2.0 }
      ],
      recentReviews: [
        {
          id: '1',
          rating: 5,
          comment: 'Excellent service! My package was delivered on time and in perfect condition.',
          createdAt: new Date().toISOString(),
          customerName: 'Alice Johnson',
          customerId: 'cust1',
          customerProfilePicture: undefined,
          driverName: 'John Driver',
          driverId: '1',
          parcelId: 'PK001'
        },
        {
          id: '2',
          rating: 4,
          comment: 'Good delivery service. Driver was professional and courteous.',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          customerName: 'Bob Smith',
          customerId: 'cust2',
          customerProfilePicture: undefined,
          driverName: 'Sarah Wilson',
          driverId: '2',
          parcelId: 'PK002'
        },
        {
          id: '3',
          rating: 5,
          comment: 'Amazing experience! Will definitely use this service again.',
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          customerName: 'Carol Davis',
          customerId: 'cust3',
          customerProfilePicture: undefined,
          driverName: 'Mike Johnson',
          driverId: '3',
          parcelId: 'PK003'
        }
      ],
      satisfactionTrends: [
        { month: 'Jul', rating: 4.4 },
        { month: 'Aug', rating: 4.5 },
        { month: 'Sep', rating: 4.6 },
        { month: 'Oct', rating: 4.7 }
      ],
      feedbackCategories: [
        { category: 'Delivery Speed', positive: 85, neutral: 10, negative: 5 },
        { category: 'Driver Courtesy', positive: 92, neutral: 6, negative: 2 },
        { category: 'Package Condition', positive: 88, neutral: 8, negative: 4 },
        { category: 'Communication', positive: 78, neutral: 15, negative: 7 }
      ]
    }
  };

  // Top drivers for overview section
  topDrivers: Driver[] = [];

  // Reviews filtering and pagination
  selectedRatingFilter: number = 0; // 0 = all, 1-5 = specific rating
  filteredReviews: Review[] = [];
  currentReviewPage: number = 1;
  reviewsPerPage: number = 3;

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
    if (tab === 'analytics') {
      if (!this.isLoadingAnalytics) {
        this.loadAnalyticsData();
      }
    }
  }

  switchChartPeriod(period: string) {
    this.chartPeriod = period;
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

  private initializeDefaultDrivers(): void {
    // Initialize top drivers with default data
    this.topDrivers = [
      {
        id: '1',
        name: 'John Driver',
        email: 'john@example.com',
        phone: '+254700000001',
        vehicleType: 'Motorcycle',
        isAvailable: true,
        averageRating: 4.8,
        totalDeliveries: 156,
        completedDeliveries: 150,
        onTimeDeliveryRate: 95,
        averageDeliveryTime: 2.5,
        totalEarnings: 45000,
        lastActiveAt: new Date().toISOString(),
        profilePicture: undefined
      },
      {
        id: '2',
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        phone: '+254700000002',
        vehicleType: 'Car',
        isAvailable: true,
        averageRating: 4.6,
        totalDeliveries: 142,
        completedDeliveries: 138,
        onTimeDeliveryRate: 92,
        averageDeliveryTime: 3.2,
        totalEarnings: 42000,
        lastActiveAt: new Date().toISOString(),
        profilePicture: undefined
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        phone: '+254700000003',
        vehicleType: 'Motorcycle',
        isAvailable: false,
        averageRating: 4.4,
        totalDeliveries: 128,
        completedDeliveries: 125,
        onTimeDeliveryRate: 89,
        averageDeliveryTime: 2.8,
        totalEarnings: 38000,
        lastActiveAt: new Date().toISOString(),
        profilePicture: undefined
      }
    ];
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
    console.log('🔍 Loading analytics data...');
    
    this.adminService.getAnalyticsData().pipe(
      catchError(error => {
        console.error('❌ Error loading analytics data:', error);
        this.generateMockAnalyticsData();
        this.isLoadingAnalytics = false;
        return of(null);
      })
    ).subscribe({
      next: (data) => {
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
              .sort((a, b) => b.averageRating - a.averageRating)
              .slice(0, 3);
          } else {
            // If no driver data, use mock drivers
            this.initializeDefaultDrivers();
          }
          
          // Initialize filtered reviews
          this.updateFilteredReviews();
        } else {
          console.log('⚠️ No analytics data received, using mock data');
          this.generateMockAnalyticsData();
        }
        this.isLoadingAnalytics = false;
      }
    });
  }

  // Generate mock data for development/testing
  private generateMockAnalyticsData(): void {
    // Mock top drivers
    this.topDrivers = [
      {
        id: '1',
        name: 'John Driver',
        email: 'john@example.com',
        phone: '+254700000001',
        vehicleType: 'Motorcycle',
        isAvailable: true,
        averageRating: 4.8,
        totalDeliveries: 156,
        completedDeliveries: 150,
        onTimeDeliveryRate: 95,
        averageDeliveryTime: 2.5,
        totalEarnings: 45000,
        lastActiveAt: new Date().toISOString(),
        profilePicture: undefined
      },
      {
        id: '2',
        name: 'Sarah Wilson',
        email: 'sarah@example.com',
        phone: '+254700000002',
        vehicleType: 'Car',
        isAvailable: true,
        averageRating: 4.6,
        totalDeliveries: 142,
        completedDeliveries: 138,
        onTimeDeliveryRate: 92,
        averageDeliveryTime: 3.2,
        totalEarnings: 42000,
        lastActiveAt: new Date().toISOString(),
        profilePicture: undefined
      },
      {
        id: '3',
        name: 'Mike Johnson',
        email: 'mike@example.com',
        phone: '+254700000003',
        vehicleType: 'Motorcycle',
        isAvailable: false,
        averageRating: 4.4,
        totalDeliveries: 128,
        completedDeliveries: 125,
        onTimeDeliveryRate: 89,
        averageDeliveryTime: 2.8,
        totalEarnings: 38000,
        lastActiveAt: new Date().toISOString(),
        profilePicture: undefined
      }
    ];

    // Mock analytics data
    this.analyticsData = {
      revenueTrends: {
        currentMonth: 125000,
        previousMonth: 98000,
        growth: '+27.6%',
        monthlyData: [
          { month: 'Jan', revenue: 85000 },
          { month: 'Feb', revenue: 92000 },
          { month: 'Mar', revenue: 88000 },
          { month: 'Apr', revenue: 95000 },
          { month: 'May', revenue: 102000 },
          { month: 'Jun', revenue: 98000 },
          { month: 'Jul', revenue: 110000 },
          { month: 'Aug', revenue: 118000 },
          { month: 'Sep', revenue: 125000 },
          { month: 'Oct', revenue: 132000 },
          { month: 'Nov', revenue: 128000 },
          { month: 'Dec', revenue: 135000 }
        ],
        dailyData: [
          { day: 'Mon', revenue: 4500 },
          { day: 'Tue', revenue: 5200 },
          { day: 'Wed', revenue: 4800 },
          { day: 'Thu', revenue: 5500 },
          { day: 'Fri', revenue: 5800 },
          { day: 'Sat', revenue: 4200 },
          { day: 'Sun', revenue: 3800 }
        ]
      },
      deliveryPerformance: {
        totalDeliveries: 1250,
        onTimeDeliveries: 1180,
        lateDeliveries: 45,
        failedDeliveries: 25,
        onTimeRate: 94.4,
        averageDeliveryTime: 2.8,
        performanceByDriver: this.topDrivers,
        performanceByVehicle: [
          { type: 'Motorcycle', deliveries: 850, efficiency: 96 },
          { type: 'Car', deliveries: 320, efficiency: 92 },
          { type: 'Van', deliveries: 80, efficiency: 88 }
        ],
        deliveryTimeTrends: [
          { week: 'Week 1', avgTime: 2.5 },
          { week: 'Week 2', avgTime: 2.8 },
          { week: 'Week 3', avgTime: 2.6 },
          { week: 'Week 4', avgTime: 2.9 }
        ]
      },
      customerReviews: {
        overallRating: 4.6,
        totalReviews: 342,
        ratingDistribution: [
          { stars: 5, count: 180, percentage: 52.6 },
          { stars: 4, count: 95, percentage: 27.8 },
          { stars: 3, count: 45, percentage: 13.2 },
          { stars: 2, count: 15, percentage: 4.4 },
          { stars: 1, count: 7, percentage: 2.0 }
        ],
        recentReviews: [
          {
            id: '1',
            rating: 5,
            comment: 'Excellent service! My package was delivered on time and in perfect condition.',
            createdAt: new Date().toISOString(),
            customerName: 'Alice Johnson',
            customerId: 'cust1',
            customerProfilePicture: undefined,
            driverName: 'John Driver',
            driverId: '1',
            parcelId: 'PK001'
          },
          {
            id: '2',
            rating: 4,
            comment: 'Good delivery service. Driver was professional and courteous.',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            customerName: 'Bob Smith',
            customerId: 'cust2',
            customerProfilePicture: undefined,
            driverName: 'Sarah Wilson',
            driverId: '2',
            parcelId: 'PK002'
          },
          {
            id: '3',
            rating: 5,
            comment: 'Amazing experience! Will definitely use this service again.',
            createdAt: new Date(Date.now() - 172800000).toISOString(),
            customerName: 'Carol Davis',
            customerId: 'cust3',
            customerProfilePicture: undefined,
            driverName: 'Mike Johnson',
            driverId: '3',
            parcelId: 'PK003'
          },
          {
            id: '4',
            rating: 3,
            comment: 'Delivery was a bit late but package arrived safely.',
            createdAt: new Date(Date.now() - 259200000).toISOString(),
            customerName: 'David Wilson',
            customerId: 'cust4',
            customerProfilePicture: undefined,
            driverName: 'John Driver',
            driverId: '1',
            parcelId: 'PK004'
          },
          {
            id: '5',
            rating: 5,
            comment: 'Perfect service from start to finish!',
            createdAt: new Date(Date.now() - 345600000).toISOString(),
            customerName: 'Emma Brown',
            customerId: 'cust5',
            customerProfilePicture: undefined,
            driverName: 'Sarah Wilson',
            driverId: '2',
            parcelId: 'PK005'
          }
        ],
        satisfactionTrends: [
          { month: 'Jul', rating: 4.4 },
          { month: 'Aug', rating: 4.5 },
          { month: 'Sep', rating: 4.6 },
          { month: 'Oct', rating: 4.7 }
        ],
        feedbackCategories: [
          { category: 'Delivery Speed', positive: 85, neutral: 10, negative: 5 },
          { category: 'Driver Courtesy', positive: 92, neutral: 6, negative: 2 },
          { category: 'Package Condition', positive: 88, neutral: 8, negative: 4 },
          { category: 'Communication', positive: 78, neutral: 15, negative: 7 }
        ]
      }
    };

    // Initialize filtered reviews
    this.updateFilteredReviews();
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

  // Helper methods for template conditions
  hasRevenueData(): boolean {
    const currentMonth = this.analyticsData.revenueTrends.currentMonth || 0;
    const previousMonth = this.analyticsData.revenueTrends.previousMonth || 0;
    const hasData = currentMonth > 0 || previousMonth > 0;
    console.log('💰 Has revenue data:', hasData, 'Current month:', currentMonth, 'Previous month:', previousMonth);
    return hasData;
  }

  hasReviewsData(): boolean {
    const totalReviews = this.analyticsData.customerReviews.totalReviews || 0;
    const hasData = totalReviews > 0;
    console.log('📦 Has reviews data:', hasData, 'Total reviews:', totalReviews);
    return hasData;
  }
}
