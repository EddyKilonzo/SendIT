import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ToastService } from '../components/shared/toast/toast.service';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

// Backend API Response DTOs
export interface ApiResponseDto<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponseDto<T = unknown> extends ApiResponseDto<T[]> {
  pagination: PaginationDto;
}

export interface QueryOptionsDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  include?: string[];
  fields?: string[];
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  isAvailable?: boolean;
  currentLat?: number;
  currentLng?: number;
  averageRating?: number;
  totalRatings?: number;
  totalDeliveries?: number;
  completedDeliveries?: number;
  cancelledDeliveries?: number;
  averageDeliveryTime?: number;
  onTimeDeliveryRate?: number;
  lastActiveAt?: string;
  totalEarnings?: number;
  totalParcelsEverSent?: number;
  totalParcelsReceived?: number;
  preferredPaymentMethod?: string;
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: string;
  driverApprovalDate?: string;
  driverRejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Parcel {
  id: string;
  trackingNumber: string;
  senderId?: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  driverId?: string;
  assignedAt?: string;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered_to_recipient' | 'delivered' | 'completed' | 'cancelled';
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  estimatedPickupTime?: string;
  actualPickupTime?: string;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  totalDeliveryTime?: number;
  deliveryAttempts: number;
  deliveryFee?: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  deliveredToRecipient: boolean;
  deliveryConfirmedAt?: string;
  deliveryConfirmedBy?: string;
  customerSignature?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
  sender?: UserResponseDto;
  recipient?: UserResponseDto;
  driver?: UserResponseDto;
  statusHistory?: any[];
  reviews?: any[];
  deliveryProof?: any;
}

export interface UserDashboardData {
  totalParcelsSent: number;
  totalParcelsReceived: number;
  parcelsInTransit: number;
  scheduledForTomorrow: number;
  totalSpent: number;
  recentParcels: Parcel[];
  summaryCards: {
    title: string;
    value: string | number;
    icon: string;
  }[];
  totalParcels: number;
}

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  private apiUrl = environment.apiUrl;

  constructor(
    protected http: HttpClient,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  protected getApiUrl(endpoint: string): string {
    return `${this.apiUrl}${endpoint}`;
  }

  protected handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (error.status === 403) {
        errorMessage = 'Access denied. You do not have permission to perform this action.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = `Error Code: ${error.status}`;
      }
    }

    this.toastService.showError(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  protected buildParams(params: Record<string, any>): HttpParams {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined) {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });
    
    return httpParams;
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get user's parcels
  getUserParcels(type: 'sent' | 'received' = 'sent', page: number = 1, limit: number = 10): Observable<{
    parcels: Parcel[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = {
      type: type,
      page: page.toString(),
      limit: limit.toString(),
      _t: new Date().getTime().toString() // Cache buster
    };

    console.log(`🚀 API Call - getUserParcels(${type})`);
    console.log(`📋 Parameters:`, params);

    return this.http.get<Parcel[]>(`${this.apiUrl}/parcels/my-parcels`, { 
      headers: this.getHeaders(),
      params: this.buildParams(params)
    }).pipe(
      catchError(error => {
        console.error(`❌ API Error - getUserParcels(${type}):`, error);
        return this.handleError(error);
      }),
      // Transform the response to match the expected format
      map(parcels => {
        console.log(`📦 API Response - getUserParcels(${type}):`, parcels);
        return {
          parcels: parcels,
          total: parcels.length,
          page: page,
          limit: limit
        };
      })
    );
  }

  // Get user dashboard data
  getUserDashboardData(): Observable<UserDashboardData> {
    const params = {
      _t: new Date().getTime().toString() // Cache buster
    };

    return this.http.get<{success: boolean; data: UserDashboardData; message: string}>(`${this.apiUrl}/users/dashboard`, {
      headers: this.getHeaders(),
      params: this.buildParams(params)
    }).pipe(
      map(response => response.data),
      catchError(error => this.handleError(error))
    );
  }

  // Get all parcels for current user (both sent and received)
  getAllUserParcels(): Observable<{
    parcels: Parcel[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = {
      _t: new Date().getTime().toString() // Cache buster
    };

    return this.http.get<{
      parcels: Parcel[];
      total: number;
      page: number;
      limit: number;
    }>(`${this.apiUrl}/parcels`, {
      headers: this.getHeaders(),
      params: this.buildParams(params)
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  // Get parcel by ID
  getParcelById(id: string): Observable<Parcel> {
    return this.http.get<Parcel>(`${this.apiUrl}/parcels/${id}`, {
      headers: this.getHeaders()
    });
  }

  // Get parcel by tracking number
  getParcelByTrackingNumber(trackingNumber: string): Observable<Parcel> {
    return this.http.get<Parcel>(`${this.apiUrl}/parcels/tracking/${trackingNumber}`, {
      headers: this.getHeaders()
    });
  }

  // Mark parcel as completed
  markAsCompleted(parcelId: string, data: any = {}): Observable<Parcel> {
    return this.http.patch<Parcel>(`${this.apiUrl}/parcels/${parcelId}/mark-as-completed`, data, {
      headers: this.getHeaders()
    });
  }
} 