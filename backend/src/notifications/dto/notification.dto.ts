// Notification DTOs
export interface CreateNotificationDto {
  userId: string;
  title: string;
  message: string;
  type:
    | 'PARCEL_CREATED'
    | 'PARCEL_ASSIGNED'
    | 'PARCEL_PICKED_UP'
    | 'PARCEL_IN_TRANSIT'
    | 'PARCEL_DELIVERED_TO_RECIPIENT'
    | 'PARCEL_DELIVERED'
    | 'DRIVER_ASSIGNED'
    | 'PAYMENT_RECEIVED'
    | 'REVIEW_RECEIVED';
  actionUrl?: string;
  parcelId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResponseDto {
  id: string;
  userId: string;
  title: string;
  message: string;
  type:
    | 'PARCEL_CREATED'
    | 'PARCEL_ASSIGNED'
    | 'PARCEL_PICKED_UP'
    | 'PARCEL_IN_TRANSIT'
    | 'PARCEL_DELIVERED_TO_RECIPIENT'
    | 'PARCEL_DELIVERED'
    | 'DRIVER_ASSIGNED'
    | 'PAYMENT_RECEIVED'
    | 'REVIEW_RECEIVED';
  isRead: boolean;
  actionUrl?: string;
  parcelId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  readAt?: Date;
  parcel?: any; // ParcelResponseDto
}

export interface NotificationSummaryDto {
  totalNotifications: number;
  unreadCount: number;
  recentNotifications: NotificationResponseDto[];
  notificationsByType: Record<string, number>;
}

export interface NotificationsQueryDto {
  page?: number;
  limit?: number;
  userId?: string;
  type?:
    | 'PARCEL_CREATED'
    | 'PARCEL_ASSIGNED'
    | 'PARCEL_PICKED_UP'
    | 'PARCEL_IN_TRANSIT'
    | 'PARCEL_DELIVERED_TO_RECIPIENT'
    | 'PARCEL_DELIVERED'
    | 'DRIVER_ASSIGNED'
    | 'PAYMENT_RECEIVED'
    | 'REVIEW_RECEIVED';
  isRead?: boolean;
  parcelId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy?: 'createdAt' | 'type' | 'isRead';
  sortOrder?: 'asc' | 'desc';
}
