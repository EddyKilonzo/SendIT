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
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please login again.';
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
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

  getDrivers(query: {
    page?: number;
    limit?: number;
    search?: string;
    vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
    minimumRating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Observable<DriversResponse> {
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

  getDriver(id: string): Observable<Driver> {
    return this.http.get<Driver>(
      this.getApiUrl(`/drivers/${id}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getDriverPerformance(id: string): Observable<any> {
    return this.http.get<any>(
      this.getApiUrl(`/drivers/${id}/performance`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  assignParcel(assignParcelDto: AssignParcelDto): Observable<AssignParcelResponse> {
    return this.http.post<AssignParcelResponse>(
      this.getApiUrl('/drivers/assign-parcel'),
      assignParcelDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  reassignParcel(parcelId: string, reassignData: { action: string; newDriverId: string }): Observable<any> {
    return this.http.patch<any>(
      this.getApiUrl(`/admin/parcels/${parcelId}/manage`),
      reassignData,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getAvailableDrivers(): Observable<DriversResponse> {
    console.log('🚗 Getting available drivers...');
    const query = {
      limit: 50,
      sortBy: 'averageRating',
      sortOrder: 'desc' as const
    };
    console.log('🔍 Query parameters:', query);
    return this.getDrivers(query);
  }
} 