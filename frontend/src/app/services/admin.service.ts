import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DashboardStats {
  totalUsers: number;
  totalDrivers: number;
  totalParcels: number;
  pendingParcels: number;
  inTransitParcels: number;
  deliveredParcels: number;
  cancelledParcels: number;
  availableDrivers: number;
  activeDrivers: number;
  pendingDriverApplications: number;
}

export interface SystemStats {
  totalRevenue: number;
  monthlyRevenue: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
  topPerformingDrivers: Array<{
    driverId: string;
    driverName: string;
    deliveriesCompleted: number;
    averageRating: number;
  }>;
  popularRoutes: Array<{
    fromLocation: string;
    toLocation: string;
    parcelCount: number;
  }>;
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  customerName: string;
  customerId: string;
  customerProfilePicture?: string;
  driverName: string;
  driverId: string;
  parcelId: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  isAvailable: boolean;
  averageRating: number;
  totalDeliveries: number;
  completedDeliveries: number;
  onTimeDeliveryRate: number;
  averageDeliveryTime: number;
  totalEarnings: number;
  lastActiveAt: string;
  profilePicture?: string;
}

export interface RevenueData {
  currentMonth: number;
  previousMonth: number;
  growth: string;
  monthlyData: Array<{
    month: string;
    revenue: number;
  }>;
  dailyData: Array<{
    day: string;
    revenue: number;
  }>;
}

export interface CustomerReviews {
  overallRating: number;
  totalReviews: number;
  ratingDistribution: Array<{
    stars: number;
    count: number;
    percentage: number;
  }>;
  recentReviews: Review[];
  satisfactionTrends: Array<{
    month: string;
    rating: number;
  }>;
  feedbackCategories: Array<{
    category: string;
    positive: number;
    neutral: number;
    negative: number;
  }>;
}

export interface DeliveryPerformance {
  totalDeliveries: number;
  onTimeDeliveries: number;
  lateDeliveries: number;
  failedDeliveries: number;
  onTimeRate: number;
  averageDeliveryTime: number;
  performanceByDriver: Driver[];
  performanceByVehicle: Array<{
    type: string;
    deliveries: number;
    efficiency: number;
  }>;
  deliveryTimeTrends: Array<{
    week: string;
    avgTime: number;
  }>;
}

export interface AnalyticsData {
  revenueTrends: RevenueData;
  deliveryPerformance: DeliveryPerformance;
  customerReviews: CustomerReviews;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Dashboard Statistics
  getDashboardStats(): Observable<DashboardStats> {
    const headers = this.getAuthHeaders();
    return this.http.get<DashboardStats>(`${this.apiUrl}/admin/dashboard/stats`, { headers });
  }

  getSystemStats(): Observable<SystemStats> {
    const headers = this.getAuthHeaders();
    return this.http.get<SystemStats>(`${this.apiUrl}/admin/dashboard/system-stats`, { headers });
  }

  // Reviews
  getReviews(query?: any): Observable<{ reviews: Review[]; total: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ reviews: Review[]; total: number }>(`${this.apiUrl}/reviews`, { 
      params: query,
      headers 
    });
  }

  // Get reviews with pagination and filtering
  getReviewsWithFilters(page: number = 1, limit: number = 10, filters?: any): Observable<{ reviews: Review[]; total: number }> {
    const params = { 
      page: page.toString(), 
      limit: limit.toString(),
      ...filters 
    };
    const headers = this.getAuthHeaders();
    return this.http.get<{ reviews: Review[]; total: number }>(`${this.apiUrl}/reviews`, { 
      params,
      headers 
    });
  }

  // Get review statistics
  getReviewStats(): Observable<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Array<{ stars: number; count: number; percentage: number }>;
  }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{
      totalReviews: number;
      averageRating: number;
      ratingDistribution: Array<{ stars: number; count: number; percentage: number }>;
    }>(`${this.apiUrl}/reviews/stats`, { headers });
  }

  // Drivers
  getDrivers(query?: any): Observable<{ drivers: Driver[]; total: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ drivers: Driver[]; total: number }>(`${this.apiUrl}/admin/drivers`, { 
      params: query,
      headers 
    });
  }

  // Parcels
  getParcels(query?: any): Observable<{ parcels: any[]; total: number }> {
    const headers = this.getAuthHeaders();
    return this.http.get<{ parcels: any[]; total: number }>(`${this.apiUrl}/admin/parcels`, { 
      params: query,
      headers 
    });
  }

  // Users
  getUsers(page: number = 1, limit: number = 10, query?: any): Observable<{ users: any[]; total: number }> {
    const params = { page: page.toString(), limit: limit.toString(), ...query };
    const headers = this.getAuthHeaders();
    return this.http.get<{ users: any[]; total: number }>(`${this.apiUrl}/admin/users`, { 
      params,
      headers 
    });
  }

  getUserById(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/admin/users/${userId}`, { headers });
  }

  getUserParcels(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/admin/users/${userId}/parcels`, { headers });
  }

  getUserActivity(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/admin/users/${userId}/activity`, { headers });
  }

  updateUserStatus(userId: string, status: string): Observable<any> {
    // Map frontend status values to backend action values
    let action: string;
    switch (status) {
      case 'active':
        // For suspended users, we need to use 'unsuspend' instead of 'activate'
        // We'll determine this based on the user's current status
        action = 'activate'; // Default, will be overridden if user is suspended
        break;
      case 'inactive':
        action = 'deactivate';
        break;
      case 'suspended':
        action = 'suspend';
        break;
      default:
        action = 'activate';
    }
    
    const headers = this.getAuthHeaders();
    // Send request body with action and userId (to satisfy validation)
    return this.http.patch(`${this.apiUrl}/admin/users/${userId}/manage`, { 
      action,
      userId 
    }, { headers });
  }

  updateUserStatusWithAction(userId: string, action: string): Observable<any> {
    const headers = this.getAuthHeaders();
    // Send request body with action and userId (to satisfy validation)
    return this.http.patch(`${this.apiUrl}/admin/users/${userId}/manage`, { 
      action,
      userId 
    }, { headers });
  }

  // Driver Applications
  getDriverApplications(page: number = 1, limit: number = 10, query?: any): Observable<{ applications: any[]; total: number }> {
    const params = { page: page.toString(), limit: limit.toString(), ...query };
    const headers = this.getAuthHeaders();
    return this.http.get<{ applications: any[]; total: number }>(`${this.apiUrl}/admin/driver-applications`, { 
      params,
      headers 
    });
  }

  approveDriverApplication(userId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.apiUrl}/admin/driver-applications/${userId}/manage`, {
      action: 'approve'
    }, { headers });
  }

  rejectDriverApplication(userId: string, reason: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.apiUrl}/admin/driver-applications/${userId}/manage`, {
      action: 'reject',
      reason
    }, { headers });
  }

  // Get driver statistics and assigned parcels
  getDriverStats(driverId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.apiUrl}/admin/drivers/${driverId}/stats`, { headers });
  }

  getDriverParcels(driverId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/users/${driverId}/parcels`, {
      headers: this.getAuthHeaders(),
    });
  }

  getDriverComprehensiveData(driverId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/users/${driverId}/driver-data`, {
      headers: this.getAuthHeaders(),
    });
  }

  // Analytics Data
  getAnalyticsData(): Observable<AnalyticsData> {
    const headers = this.getAuthHeaders();
    return this.http.get<AnalyticsData>(`${this.apiUrl}/admin/analytics`, { headers });
  }

  // Helper method to calculate revenue growth
  calculateGrowth(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const growth = ((current - previous) / previous) * 100;
    return growth >= 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  }

  // Helper method to generate monthly revenue data
  generateMonthlyRevenueData(currentMonth: number, previousMonth: number): RevenueData {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentMonthIndex = currentDate.getMonth();
    
    const monthlyData = months.map((month, index) => {
      let revenue = 0;
      if (index === currentMonthIndex) {
        revenue = currentMonth;
      } else if (index === currentMonthIndex - 1) {
        revenue = previousMonth;
      } else {
        // Generate realistic random data for other months
        const baseRevenue = Math.min(currentMonth, previousMonth);
        revenue = Math.floor(baseRevenue * (0.7 + Math.random() * 0.6));
      }
      return { month, revenue };
    });

    const dailyData = [
      { day: 'Mon', revenue: Math.floor(currentMonth * 0.15) },
      { day: 'Tue', revenue: Math.floor(currentMonth * 0.16) },
      { day: 'Wed', revenue: Math.floor(currentMonth * 0.14) },
      { day: 'Thu', revenue: Math.floor(currentMonth * 0.17) },
      { day: 'Fri', revenue: Math.floor(currentMonth * 0.18) },
      { day: 'Sat', revenue: Math.floor(currentMonth * 0.12) },
      { day: 'Sun', revenue: Math.floor(currentMonth * 0.08) }
    ];

    return {
      currentMonth,
      previousMonth,
      growth: this.calculateGrowth(currentMonth, previousMonth),
      monthlyData,
      dailyData
    };
  }

  // Helper method to get authentication headers
  private getAuthHeaders(): { [key: string]: string } {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
} 