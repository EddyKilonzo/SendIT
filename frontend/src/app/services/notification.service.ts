import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from '../components/shared/toast/toast.service';
import { environment } from '../../environments/environment';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  actionUrl?: string;
  parcelId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
  parcel?: any;
}

export interface NotificationSummary {
  totalNotifications: number;
  unreadCount: number;
  recentNotifications: Notification[];
  notificationsByType: Record<string, number>;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  type?: string;
  isRead?: boolean;
  parcelId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'createdAt' | 'type' | 'isRead';
  sortOrder?: 'asc' | 'desc';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = environment.apiUrl;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private isLoadingSubject = new BehaviorSubject<boolean>(false);

  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();

  // Check if backend is available
  private isBackendAvailable = true;

  private checkBackendAvailability(): boolean {
    // For now, assume backend is available since it's running
    // TODO: Implement proper health check when needed
    return true;
  }

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService
  ) {
    // Initialize notifications when user is authenticated
    this.authService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        console.log('🔐 User authenticated, loading notifications...');
        // Add a small delay to ensure user data is loaded
        setTimeout(() => {
          this.loadNotificationSummary();
        }, 500);
      } else {
        console.log('🚪 User logged out, clearing notifications...');
        this.clearNotifications();
      }
    });
  }

  private getHeaders(): { [key: string]: string } {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('⚠️ No authentication token found!');
    } else {
      console.log('🔑 Authentication token found, length:', token.length);
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private getApiUrl(endpoint: string): string {
    return `${this.baseUrl}/notifications${endpoint}`;
  }

  private handleError(error: any): Observable<never> {
    console.error('Notification service error:', error);
    let errorMessage = 'An error occurred while processing your request.';
    
    if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 401) {
      errorMessage = 'Authentication required. Please login again.';
      // Clear notifications and redirect to login if needed
      this.clearNotifications();
    } else if (error.status === 0) {
      errorMessage = 'Unable to connect to server. Please check your connection.';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Only show toast for non-network errors to avoid spam
    if (error.status !== 0) {
      this.toastService.showError(errorMessage);
    }
    return throwError(() => error);
  }

  // Load notification summary (unread count and recent notifications)
  loadNotificationSummary(): Observable<NotificationSummary> {
    if (!this.checkBackendAvailability()) {
      console.warn('Backend not available, skipping notification load');
      return throwError(() => new Error('Backend not available'));
    }

    // Check if user is authenticated
    const isAuth = this.authService.isAuthenticated();
    const token = this.authService.getToken();
    console.log('🔍 Auth check - isAuthenticated:', isAuth, 'hasToken:', !!token);

    if (!isAuth || !token) {
      console.warn('⚠️ User not authenticated, skipping notification load');
      return throwError(() => new Error('User not authenticated'));
    }

    this.isLoadingSubject.next(true);
    console.log('📧 Loading notification summary...');
    
    return this.http.get<NotificationSummary>(
      this.getApiUrl('/summary'),
      { headers: this.getHeaders() }
    ).pipe(
      tap(summary => {
        console.log('✅ Notification summary loaded:', {
          total: summary.totalNotifications,
          unread: summary.unreadCount,
          recent: summary.recentNotifications.length
        });
        this.unreadCountSubject.next(summary.unreadCount);
        this.notificationsSubject.next(summary.recentNotifications);
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        console.error('❌ Error loading notification summary:', error);
        return this.handleError(error);
      })
    );
  }

  // Get notifications with pagination and filters
  getNotifications(query: NotificationsQuery = {}): Observable<NotificationsResponse> {
    if (!this.checkBackendAvailability()) {
      console.warn('Backend not available, skipping notification load');
      return throwError(() => new Error('Backend not available'));
    }

    // Check if user is authenticated
    const isAuth = this.authService.isAuthenticated();
    const token = this.authService.getToken();
    console.log('🔍 Auth check - isAuthenticated:', isAuth, 'hasToken:', !!token);

    if (!isAuth || !token) {
      console.warn('⚠️ User not authenticated, skipping notification load');
      return throwError(() => new Error('User not authenticated'));
    }

    this.isLoadingSubject.next(true);
    
    let params = new HttpParams();
    
    if (query.page) params = params.set('page', query.page.toString());
    if (query.limit) params = params.set('limit', query.limit.toString());
    if (query.type) params = params.set('type', query.type);
    if (query.isRead !== undefined) params = params.set('isRead', query.isRead.toString());
    if (query.parcelId) params = params.set('parcelId', query.parcelId);
    if (query.dateFrom) params = params.set('dateFrom', query.dateFrom.toISOString());
    if (query.dateTo) params = params.set('dateTo', query.dateTo.toISOString());
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);

    return this.http.get<NotificationsResponse>(
      this.getApiUrl(''),
      { headers: this.getHeaders(), params }
    ).pipe(
      tap(response => {
        this.isLoadingSubject.next(false);
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        return this.handleError(error);
      })
    );
  }

  // Mark a single notification as read
  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.patch<Notification>(
      this.getApiUrl(`/${notificationId}/read`),
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(notification => {
        // Update the notification in the list
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(n => 
          n.id === notificationId ? notification : n
        );
        this.notificationsSubject.next(updatedNotifications);
        
        // Update unread count
        const currentUnreadCount = this.unreadCountSubject.value;
        if (!notification.isRead && currentUnreadCount > 0) {
          this.unreadCountSubject.next(currentUnreadCount - 1);
        }
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<{ updatedCount: number }> {
    return this.http.patch<{ updatedCount: number }>(
      this.getApiUrl('/mark-all-read'),
      {},
      { headers: this.getHeaders() }
    ).pipe(
      tap(result => {
        // Update all notifications to read
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date()
        }));
        this.notificationsSubject.next(updatedNotifications);
        
        // Reset unread count
        this.unreadCountSubject.next(0);
        
        this.toastService.showSuccess(`${result.updatedCount} notifications marked as read`);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Delete a single notification
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(
      this.getApiUrl(`/${notificationId}`),
      { headers: this.getHeaders() }
    ).pipe(
      tap(() => {
        // Remove the notification from the list
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.filter(n => n.id !== notificationId);
        this.notificationsSubject.next(updatedNotifications);
        
        // Update unread count if the deleted notification was unread
        const deletedNotification = currentNotifications.find(n => n.id === notificationId);
        if (deletedNotification && !deletedNotification.isRead) {
          const currentUnreadCount = this.unreadCountSubject.value;
          if (currentUnreadCount > 0) {
            this.unreadCountSubject.next(currentUnreadCount - 1);
          }
        }
        
        this.toastService.showSuccess('Notification deleted successfully');
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Delete all notifications
  deleteAllNotifications(): Observable<{ deletedCount: number }> {
    return this.http.delete<{ deletedCount: number }>(
      this.getApiUrl(''),
      { headers: this.getHeaders() }
    ).pipe(
      tap(result => {
        // Clear all notifications
        this.notificationsSubject.next([]);
        this.unreadCountSubject.next(0);
        
        this.toastService.showSuccess(`${result.deletedCount} notifications deleted successfully`);
      }),
      catchError(this.handleError.bind(this))
    );
  }

  // Get a single notification
  getNotification(notificationId: string): Observable<Notification> {
    return this.http.get<Notification>(
      this.getApiUrl(`/${notificationId}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Refresh notifications (reload summary)
  refreshNotifications(): void {
    this.loadNotificationSummary().subscribe();
  }



  // Clear notifications (when user logs out)
  clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.isLoadingSubject.next(false);
  }

  // Get current unread count
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  // Get current notifications array
  getCurrentNotifications(): Notification[] {
    return this.notificationsSubject.value;
  }

  // Check if loading
  getIsLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  // Format notification date
  formatNotificationDate(date: Date | string): string {
    const notificationDate = new Date(date);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  }

  // Get notification icon based on type
  getNotificationIcon(type: string): string {
    switch (type) {
      case 'PARCEL_CREATED':
        return 'fas fa-box';
      case 'PARCEL_ASSIGNED':
        return 'fas fa-user-tie';
      case 'PARCEL_PICKED_UP':
        return 'fas fa-truck';
      case 'PARCEL_IN_TRANSIT':
        return 'fas fa-route';
      case 'PARCEL_DELIVERED_TO_RECIPIENT':
        return 'fas fa-motorcycle';
      case 'PARCEL_DELIVERED':
        return 'fas fa-check-circle';
      case 'PARCEL_COMPLETED':
        return 'fas fa-check-double';
      case 'DRIVER_ASSIGNED':
        return 'fas fa-user-tie';
      case 'PAYMENT_RECEIVED':
        return 'fas fa-credit-card';
      case 'REVIEW_RECEIVED':
        return 'fas fa-star';
      default:
        return 'fas fa-bell';
    }
  }

  // Get notification color based on type
  getNotificationColor(type: string): string {
    switch (type) {
      case 'PARCEL_CREATED':
      case 'PARCEL_ASSIGNED':
        return '#DBBB02'; // Yellow
      case 'PARCEL_PICKED_UP':
      case 'PARCEL_IN_TRANSIT':
        return '#3B82F6'; // Blue
      case 'PARCEL_DELIVERED':
      case 'PARCEL_COMPLETED':
        return '#10B981'; // Green
      case 'PAYMENT_RECEIVED':
        return '#059669'; // Emerald
      case 'REVIEW_RECEIVED':
        return '#F59E0B'; // Amber
      default:
        return '#6B7280'; // Gray
    }
  }
} 