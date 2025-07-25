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
  driverName: string;
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
    return this.http.get<DashboardStats>(`${this.apiUrl}/admin/dashboard/stats`);
  }

  getSystemStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.apiUrl}/admin/dashboard/system-stats`);
  }

  // Reviews
  getReviews(query?: any): Observable<{ reviews: Review[]; total: number }> {
    return this.http.get<{ reviews: Review[]; total: number }>(`${this.apiUrl}/reviews`, { params: query });
  }

  // Drivers
  getDrivers(query?: any): Observable<{ drivers: Driver[]; total: number }> {
    return this.http.get<{ drivers: Driver[]; total: number }>(`${this.apiUrl}/admin/drivers`, { params: query });
  }

  // Parcels
  getParcels(query?: any): Observable<{ parcels: any[]; total: number }> {
    return this.http.get<{ parcels: any[]; total: number }>(`${this.apiUrl}/admin/parcels`, { params: query });
  }

  // Users
  getUsers(page: number = 1, limit: number = 10, query?: any): Observable<{ users: any[]; total: number }> {
    const params = { page: page.toString(), limit: limit.toString(), ...query };
    return this.http.get<{ users: any[]; total: number }>(`${this.apiUrl}/admin/users`, { params });
  }

  // Driver Applications
  getDriverApplications(page: number = 1, limit: number = 10, query?: any): Observable<{ applications: any[]; total: number }> {
    const params = { page: page.toString(), limit: limit.toString(), ...query };
    return this.http.get<{ applications: any[]; total: number }>(`${this.apiUrl}/admin/driver-applications`, { params });
  }

  approveDriverApplication(userId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/driver-applications/${userId}/manage`, {
      action: 'approve'
    });
  }

  rejectDriverApplication(userId: string, reason: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/admin/driver-applications/${userId}/manage`, {
      action: 'reject',
      reason
    });
  }

  // Analytics Data
  getAnalyticsData(): Observable<AnalyticsData> {
    return this.http.get<AnalyticsData>(`${this.apiUrl}/admin/analytics`);
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
} 