import {
  IsOptional,
  IsNumber,
  IsString,
  IsBoolean,
  IsDate,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

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
    | 'PARCEL_COMPLETED'
    | 'DRIVER_ASSIGNED'
    | 'PAYMENT_RECEIVED'
    | 'REVIEW_RECEIVED';
  actionUrl?: string;
  parcelId?: string;
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
    | 'PARCEL_COMPLETED'
    | 'DRIVER_ASSIGNED'
    | 'PAYMENT_RECEIVED'
    | 'REVIEW_RECEIVED';
  isRead: boolean;
  actionUrl?: string;
  parcelId?: string;
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

export class NotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  type?:
    | 'PARCEL_CREATED'
    | 'PARCEL_ASSIGNED'
    | 'PARCEL_PICKED_UP'
    | 'PARCEL_IN_TRANSIT'
    | 'PARCEL_DELIVERED_TO_RECIPIENT'
    | 'PARCEL_DELIVERED'
    | 'PARCEL_COMPLETED'
    | 'DRIVER_ASSIGNED'
    | 'PAYMENT_RECEIVED'
    | 'REVIEW_RECEIVED';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isRead?: boolean;

  @IsOptional()
  @IsString()
  parcelId?: string;

  @IsOptional()
  @Type(() => Date)
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  dateTo?: Date;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'type' | 'isRead';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
