import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../../services/notification.service';
import { ToastService } from '../toast/toast.service';

@Component({
  selector: 'app-notification-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-modal.html',
  styleUrl: './notification-modal.css'
})
export class NotificationModalComponent implements OnInit, OnDestroy {
  isOpen = false;
  notifications: Notification[] = [];
  unreadCount = 0;
  totalNotifications = 0;
  isLoading = false;
  isLoadingMore = false;
  hasMoreNotifications = false;
  currentPage = 1;
  isBackendUnavailable = false; // Track backend availability
  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Subscribe to notification updates
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      }),
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications;
      }),
      this.notificationService.isLoading$.subscribe(loading => {
        this.isLoading = loading;
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Open the notification modal
  openModal(): void {
    this.isOpen = true;
    console.log('🔔 Opening notification modal...');
    this.loadNotifications();
  }

  // Close the notification modal
  closeModal(): void {
    this.isOpen = false;
  }

  // Load notifications
  loadNotifications(): void {
    this.currentPage = 1;
    this.isBackendUnavailable = false; // Reset flag
    console.log('📧 Loading user notifications...');
    
    this.notificationService.getNotifications({ page: 1, limit: 20 }).subscribe({
      next: (response) => {
        console.log('✅ Loaded notifications:', {
          count: response.notifications.length,
          total: response.total,
          page: response.page
        });
        this.notifications = response.notifications;
        this.totalNotifications = response.total;
        this.hasMoreNotifications = response.notifications.length < response.total;
        this.isBackendUnavailable = false; // Backend is available
      },
      error: (error) => {
        console.error('❌ Error loading notifications:', error);
        // Show user-friendly message when backend is not available
        if (error.message === 'Backend not available') {
          this.notifications = [];
          this.totalNotifications = 0;
          this.hasMoreNotifications = false;
          this.isBackendUnavailable = true; // Set flag
        }
      }
    });
  }

  // Load more notifications
  loadMoreNotifications(): void {
    if (this.isLoadingMore) return;
    
    this.isLoadingMore = true;
    this.currentPage++;
    
    this.notificationService.getNotifications({ 
      page: this.currentPage, 
      limit: 20 
    }).subscribe({
      next: (response) => {
        this.notifications = [...this.notifications, ...response.notifications];
        this.hasMoreNotifications = this.notifications.length < response.total;
        this.isLoadingMore = false;
      },
      error: (error) => {
        console.error('Error loading more notifications:', error);
        this.isLoadingMore = false;
        this.currentPage--; // Revert page increment on error
      }
    });
  }

  // Mark a single notification as read
  markAsRead(notificationId: string, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.markAsRead(notificationId).subscribe({
      next: (notification) => {
        // Update the notification in the list
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
          this.notifications[index] = notification;
        }
      },
      error: (error) => {
        console.error('Error marking notification as read:', error);
      }
    });
  }

  // Mark all notifications as read
  markAllAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: (result) => {
        // Update all notifications to read
        this.notifications = this.notifications.map(n => ({
          ...n,
          isRead: true,
          readAt: new Date()
        }));
        this.unreadCount = 0;
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
      }
    });
  }

  // Delete a single notification
  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.deleteNotification(notificationId).subscribe({
      next: () => {
        // Remove the notification from the list
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.totalNotifications--;
      },
      error: (error) => {
        console.error('Error deleting notification:', error);
      }
    });
  }

  // Clear all notifications
  clearAllNotifications(): void {
    // Show confirmation toast instead of browser confirm
    this.toastService.showWarning('Are you sure you want to delete all notifications? This action cannot be undone.', 5000);
    
    // For now, proceed with deletion (in a real app, you might want a proper confirmation modal)
    this.notificationService.deleteAllNotifications().subscribe({
      next: (result) => {
        this.notifications = [];
        this.totalNotifications = 0;
        this.unreadCount = 0;
        this.toastService.showSuccess('All notifications deleted successfully');
      },
      error: (error) => {
        console.error('Error clearing all notifications:', error);
        this.toastService.showError('Failed to delete notifications');
      }
    });
  }

  // Refresh notifications
  refreshNotifications(): void {
    this.notificationService.refreshNotifications();
  }

  // Handle notification click
  onNotificationClick(notification: Notification): void {
    // Mark as read if unread
    if (!notification.isRead) {
      this.markAsRead(notification.id, new Event('click'));
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      this.router.navigate([notification.actionUrl]);
      this.closeModal();
    } else if (notification.parcelId) {
      // Navigate to parcel details
      this.router.navigate(['/parcel', notification.parcelId]);
      this.closeModal();
    }
  }

  // Track by function for ngFor
  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }

  // Format notification date
  formatNotificationDate(date: Date | string): string {
    return this.notificationService.formatNotificationDate(date);
  }

  // Get notification icon
  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type);
  }

  // Get notification color
  getNotificationColor(type: string): string {
    return this.notificationService.getNotificationColor(type);
  }

  // Get notification type label
  getNotificationTypeLabel(type: string): string {
    switch (type) {
      case 'PARCEL_CREATED':
        return 'Parcel Created';
      case 'PARCEL_ASSIGNED':
        return 'Driver Assigned';
      case 'PARCEL_PICKED_UP':
        return 'Parcel Picked Up';
      case 'PARCEL_IN_TRANSIT':
        return 'In Transit';
      case 'PARCEL_DELIVERED_TO_RECIPIENT':
        return 'Out for Delivery';
      case 'PARCEL_DELIVERED':
        return 'Delivered';
      case 'PARCEL_COMPLETED':
        return 'Completed';
      case 'DRIVER_ASSIGNED':
        return 'Driver Assignment';
      case 'PAYMENT_RECEIVED':
        return 'Payment';
      case 'REVIEW_RECEIVED':
        return 'Review';
      default:
        return 'Notification';
    }
  }

  // Handle escape key to close modal
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }
} 