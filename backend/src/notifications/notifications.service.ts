import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, Notification } from '@prisma/client';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  NotificationSummaryDto,
  NotificationsQueryDto,
} from './dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Create a new notification
  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: createNotificationDto.userId,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        type: createNotificationDto.type,
        actionUrl: createNotificationDto.actionUrl,
        parcelId: createNotificationDto.parcelId,
      },
      include: {
        parcel: {
          include: {
            sender: true,
            recipient: true,
            driver: true,
          },
        },
      },
    });

    return this.mapToNotificationResponse(notification);
  }

  // Get notifications for a user
  async getUserNotifications(
    userId: string,
    query: NotificationsQueryDto = {},
  ): Promise<{
    notifications: NotificationResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      isRead,
      parcelId,
      dateFrom,
      dateTo,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(type && { type }),
      ...(isRead !== undefined && { isRead }),
      ...(parcelId && { parcelId }),
      ...(dateFrom && { createdAt: { gte: dateFrom } }),
      ...(dateTo && { createdAt: { lte: dateTo } }),
    };

    // Get notifications
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          parcel: {
            include: {
              sender: true,
              recipient: true,
              driver: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((notification) =>
        this.mapToNotificationResponse(notification),
      ),
      total,
      page,
      limit,
    };
  }

  // Get notification summary for a user
  async getNotificationSummary(
    userId: string,
  ): Promise<NotificationSummaryDto> {
    const [totalNotifications, unreadCount, recentNotifications] =
      await Promise.all([
        this.prisma.notification.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, isRead: false } }),
        this.prisma.notification.findMany({
          where: { userId },
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            parcel: {
              include: {
                sender: true,
                recipient: true,
                driver: true,
              },
            },
          },
        }),
      ]);

    // Get notifications by type
    const notificationsByType = await this.prisma.notification.groupBy({
      by: ['type'],
      where: { userId },
      _count: { type: true },
    });

    const notificationsByTypeMap = notificationsByType.reduce(
      (acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      totalNotifications,
      unreadCount,
      recentNotifications: recentNotifications.map((notification) =>
        this.mapToNotificationResponse(notification),
      ),
      notificationsByType: notificationsByTypeMap,
    };
  }

  // Mark notification as read
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updatedNotification = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        parcel: {
          include: {
            sender: true,
            recipient: true,
            driver: true,
          },
        },
      },
    });

    return this.mapToNotificationResponse(updatedNotification);
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { updatedCount: result.count };
  }

  // Delete a notification
  async delete(notificationId: string, userId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  // Delete all notifications for a user
  async deleteAll(userId: string): Promise<{ deletedCount: number }> {
    const result = await this.prisma.notification.deleteMany({
      where: { userId },
    });

    return { deletedCount: result.count };
  }

  // Get a single notification
  async findOne(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      },
      include: {
        parcel: {
          include: {
            sender: true,
            recipient: true,
            driver: true,
          },
        },
      },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.mapToNotificationResponse(notification);
  }

  private mapToNotificationResponse(
    notification: Notification & {
      parcel?: any;
    },
  ): NotificationResponseDto {
    return {
      id: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      isRead: notification.isRead,
      actionUrl: notification.actionUrl || undefined,
      parcelId: notification.parcelId || undefined,
      createdAt: notification.createdAt,
      readAt: notification.readAt ?? undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      parcel: notification.parcel ?? undefined,
    };
  }
}
