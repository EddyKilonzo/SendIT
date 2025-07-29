import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from '../components/shared/toast/toast.service';
import { environment } from '../../environments/environment';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  profilePicture?: string;
  currentLat?: number;
  currentLng?: number;
  averageRating?: number;
  totalRatings?: number;
  completedDeliveries?: number;
  onTimeDeliveryRate?: number;
  lastActiveAt?: Date;
}

export interface DriversResponse {
  drivers: Driver[];
  total: number;
  page: number;
  limit: number;
}

export interface AssignParcelDto {
  parcelId: string;
  driverId: string;
  assignmentNotes?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
}

export interface AssignParcelResponse {
  message: string;
  parcel: any;
  driver: Driver;
}

@Injectable({
  providedIn: 'root'
})
export class DriversService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  private getHeaders(): { [key: string]: string } {
    const token = this.authService.getToken();
    console.log('🔐 Token available:', !!token);
    if (!token) {
      console.warn('⚠️ No authentication token found!');
      throw new Error('No authentication token available');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private getApiUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    console.error('❌ Drivers service error:', error);
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please login again.';
      console.error('🔐 Authentication error - token may be expired');
      // Clear auth and redirect to login for 401 errors
      this.authService.logout();
      window.location.href = '/login';
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
      console.error('🚫 Access denied - insufficient permissions');
    } else if (error.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (error.status === 422) {
      errorMessage = 'Validation error. Please check your input.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your connection.';
    } else {
      errorMessage = `Error Code: ${error.status}`;
    }
    
    this.toastService.showError(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  private checkAuthentication(): void {
    if (!this.authService.isAuthenticated()) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }
    
    if (!this.authService.getToken()) {
      console.error('❌ No valid token found');
      throw new Error('No valid authentication token');
    }
  }

  getDrivers(query: {
    page?: number;
    limit?: number;
    search?: string;
    vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
    minimumRating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Observable<DriversResponse> {
    this.checkAuthentication();
    
    let params = new HttpParams();
    
    Object.keys(query).forEach(key => {
      const value = query[key as keyof typeof query];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    const url = this.getApiUrl('/drivers');
    console.log('🌐 Making API call to:', url);
    console.log('🔑 Headers:', this.getHeaders());
    console.log('📝 Query params:', params.toString());

    return this.http.get<DriversResponse>(
      url,
      { 
        headers: this.getHeaders(),
        params 
      }
    ).pipe(
      catchError(error => {
        console.error('❌ API call failed:', error);
        return this.handleError(error);
      })
    );
  }

  getAllDrivers(): Observable<DriversResponse> {
    this.checkAuthentication();
    return this.getDrivers({ limit: 100 });
  }

  getDriver(id: string): Observable<Driver> {
    this.checkAuthentication();
    return this.http.get<Driver>(
      this.getApiUrl(`/drivers/${id}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getDriverPerformance(id: string): Observable<any> {
    this.checkAuthentication();
    return this.http.get<any>(
      this.getApiUrl(`/drivers/${id}/performance`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  assignParcel(assignParcelDto: AssignParcelDto): Observable<AssignParcelResponse> {
    this.checkAuthentication();
    return this.http.post<AssignParcelResponse>(
      this.getApiUrl('/drivers/assign-parcel'),
      assignParcelDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  reassignParcel(parcelId: string, reassignData: { action: string; newDriverId: string }): Observable<any> {
    this.checkAuthentication();
    return this.http.patch<any>(
      this.getApiUrl(`/admin/parcels/${parcelId}/manage`),
      reassignData,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getAvailableDrivers(): Observable<DriversResponse> {
    this.checkAuthentication();
    console.log('🚗 Getting available drivers...');
    const query = {
      limit: 50,
      sortBy: 'averageRating',
      sortOrder: 'desc' as const
    };
    console.log('🔍 Query parameters:', query);
    return this.getDrivers(query);
  }

  updateDriverLocation(driverId: string, locationData: { currentLat: number; currentLng: number }): Observable<any> {
    this.checkAuthentication();
    console.log('📍 Updating driver location:', driverId, locationData);
    
    return this.http.patch<any>(
      this.getApiUrl(`/drivers/${driverId}/location`),
      locationData,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ Failed to update driver location:', error);
        return this.handleError(error);
      })
    );
  }
} 