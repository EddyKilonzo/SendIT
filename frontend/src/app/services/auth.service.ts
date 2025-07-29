import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { ToastService } from '../components/shared/toast/toast.service';

// Backend API Response DTOs
export interface ApiResponseDto<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

// User DTOs matching backend
export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  
  // Driver-specific fields
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  isAvailable?: boolean;
  currentLat?: number;
  currentLng?: number;
  
  // Performance metrics
  averageRating?: number;
  totalRatings: number;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime?: number;
  onTimeDeliveryRate?: number;
  lastActiveAt?: Date;
  totalEarnings?: number;
  
  // Customer metrics
  totalParcelsEverSent: number;
  totalParcelsReceived: number;
  preferredPaymentMethod?: string;
  
  // Driver application fields
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  profilePicture?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  email: string;
  token: string;  // 6-digit token
  newPassword: string;
}

export interface TokenVerificationRequest {
  email: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  // Observable for authentication status
  public isAuthenticated$ = this.currentUserSubject.pipe(
    map(user => user !== null)
  );

  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('currentUser');
    
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUserSubject.next(user);
      } catch (error) {
        this.clearAuth();
      }
    }
  }

  login(loginDto: LoginDto): Observable<AuthResponse> {
    console.log('🔐 AuthService.login called with:', { email: loginDto.email });
    console.log('🌐 API URL:', this.apiUrl);
    
    return this.http.post<ApiResponseDto<AuthResponse>>(`${this.apiUrl}/auth/login`, loginDto)
      .pipe(
        map(response => {
          console.log('✅ Login response received:', response);
          if (response.success && response.data) {
            console.log('✅ Login successful, setting auth data');
            this.setAuth(response.data);
            this.toastService.showSuccess('Login successful!');
            return response.data;
          } else {
            console.error('❌ Login failed - invalid response:', response);
            throw new Error(response.message || 'Login failed');
          }
        }),
        catchError(error => {
          console.error('❌ Login error:', error);
          return this.handleError.bind(this)(error);
        })
      );
  }

  register(userData: CreateUserDto): Observable<AuthResponse> {
    return this.http.post<ApiResponseDto<AuthResponse>>(`${this.apiUrl}/auth/register`, userData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.setAuth(response.data);
            this.toastService.showSuccess('Registration successful! Welcome to SendIT.');
            return response.data;
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  logout(): Observable<boolean> {
    const user = this.currentUserSubject.value;
    console.log('Logout called, user:', user);
    console.log('API URL:', this.apiUrl);
    
    if (user) {
      const logoutUrl = `${this.apiUrl}/auth/logout`;
      console.log('Making logout request to:', logoutUrl);
      
      return this.http.post<ApiResponseDto<boolean>>(logoutUrl, {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).pipe(
        map(response => {
          console.log('Logout response:', response);
          this.clearAuth();
          return true;
        }),
        catchError(error => {
          console.error('Logout API error:', error);
          
          // Handle connection refused errors gracefully
          if (error.status === 0 || error.statusText === 'Unknown Error') {
            console.log('Connection refused or network error, clearing auth locally');
            this.clearAuth();
            return new Observable<boolean>(observer => {
              observer.next(true);
              observer.complete();
            });
          }
          
          // Even if logout API fails, clear local auth
          this.clearAuth();
          return throwError(() => error);
        })
      );
    } else {
      console.log('No user found, clearing auth locally');
      this.clearAuth();
      return new Observable<boolean>(observer => {
        observer.next(true);
        observer.complete();
      });
    }
  }

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      console.error('❌ No refresh token available');
      return throwError(() => new Error('No refresh token available'));
    }

    console.log('🔄 Attempting to refresh token...');
    
    return this.http.post<ApiResponseDto<AuthResponse>>(`${this.apiUrl}/auth/refresh`, { refreshToken })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            console.log('✅ Token refresh successful');
            this.setAuth(response.data);
            return response.data;
          } else {
            console.error('❌ Token refresh failed:', response.message);
            throw new Error(response.message || 'Token refresh failed');
          }
        }),
        catchError(error => {
          console.error('❌ Token refresh error:', error);
          return this.handleError(error);
        })
      );
  }

  // Password Reset Flow with 6-digit tokens
  requestPasswordReset(email: string): Observable<boolean> {
    return this.http.post<ApiResponseDto<boolean>>(`${this.apiUrl}/auth/forgot-password`, { email })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastService.showSuccess('If the email exists, a reset code has been sent to your email.');
            return true;
          } else {
            throw new Error(response.message || 'Password reset request failed');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  verifyResetToken(email: string, token: string): Observable<boolean> {
    return this.http.post<ApiResponseDto<boolean>>(`${this.apiUrl}/auth/verify-reset-token`, { email, token })
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.toastService.showSuccess('Token verified successfully');
            return true;
          } else {
            throw new Error(response.message || 'Invalid or expired reset token');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  confirmPasswordReset(email: string, token: string, newPassword: string): Observable<boolean> {
    return this.http.post<ApiResponseDto<boolean>>(`${this.apiUrl}/auth/reset-password`, { 
      email, 
      token, 
      newPassword 
    })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastService.showSuccess('Password reset successfully. You can now login with your new password.');
            return true;
          } else {
            throw new Error(response.message || 'Password reset failed');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<boolean> {
    return this.http.post<ApiResponseDto<boolean>>(`${this.apiUrl}/auth/change-password`, {
      currentPassword,
      newPassword
    })
      .pipe(
        map(response => {
          if (response.success) {
            this.toastService.showSuccess('Password changed successfully');
            return true;
          } else {
            throw new Error(response.message || 'Password change failed');
          }
        }),
        catchError(this.handleError.bind(this))
      );
  }

  private setAuth(response: AuthResponse): void {
    localStorage.setItem('accessToken', response.accessToken);
    localStorage.setItem('refreshToken', response.refreshToken);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  private clearAuth(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
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
        this.clearAuth();
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

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  updateCurrentUser(user: User): void {
    // Update the current user in memory
    this.currentUserSubject.next(user);
    
    // Update the user in localStorage to prevent caching issues
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    const user = this.currentUserSubject.value;
    const tokenValid = this.isTokenValid();
    return user !== null && tokenValid;
  }

  // Role-based access control methods
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.currentUserSubject.value;
    return user ? roles.includes(user.role) : false;
  }

  isCustomer(): boolean {
    return this.hasRole('CUSTOMER');
  }

  isDriver(): boolean {
    return this.hasRole('DRIVER');
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isDriverOrAdmin(): boolean {
    return this.hasAnyRole(['DRIVER', 'ADMIN']);
  }

  isCustomerOrAdmin(): boolean {
    return this.hasAnyRole(['CUSTOMER', 'ADMIN']);
  }

  // Permission-based methods
  canCreateParcel(): boolean {
    return this.hasAnyRole(['CUSTOMER', 'ADMIN']);
  }

  canViewAllParcels(): boolean {
    return this.isAdmin();
  }

  canAssignParcels(): boolean {
    return this.isAdmin();
  }

  canUpdateParcelStatus(): boolean {
    return this.hasAnyRole(['DRIVER', 'ADMIN']);
  }

  canManageUsers(): boolean {
    return this.isAdmin();
  }

  canManageDrivers(): boolean {
    return this.isAdmin();
  }

  canViewDashboard(): boolean {
    return this.isAdmin();
  }

  canApplyAsDriver(): boolean {
    return this.isCustomer();
  }

  canCreateReviews(): boolean {
    return this.isCustomer();
  }

  canViewDriverReviews(): boolean {
    return this.hasAnyRole(['DRIVER', 'ADMIN']);
  }

  // Get token for HTTP requests
  getToken(): string | null {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      if (payload.exp && payload.exp < currentTime) {
        console.warn('Token has expired, clearing auth');
        this.clearAuth();
        return null;
      }
    } catch (error) {
      console.warn('Invalid token format, clearing auth');
      this.clearAuth();
      return null;
    }
    
    return token;
  }

  // Check if user is authenticated and token is valid
  isTokenValid(): boolean {
    const token = this.getToken();
    return token !== null;
  }

  getAuthHeaders(): { [key: string]: string } {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available');
    }
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  getUserId(): string | null {
    const user = this.getCurrentUser();
    return user?.id || null;
  }
} 