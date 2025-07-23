import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  // Add other user properties as needed
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    // Check for existing token on app start
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

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(
        map(response => {
          this.setAuth(response);
          return response;
        })
      );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', userData)
      .pipe(
        map(response => {
          this.setAuth(response);
          return response;
        })
      );
  }

  logout(): void {
    const user = this.currentUserSubject.value;
    if (user) {
      this.http.post('/api/auth/logout', {}).subscribe();
    }
    this.clearAuth();
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

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
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
    return this.hasRole('ADMIN');
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
    return localStorage.getItem('accessToken');
  }

  // Refresh token
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<AuthResponse>('/api/auth/refresh', { refreshToken })
      .pipe(
        map(response => {
          this.setAuth(response);
          return response;
        })
      );
  }
} 