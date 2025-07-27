import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Request,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, NotificationsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

interface AuthenticatedRequest {
  user: {
    id: string;
    role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @Roles('ADMIN')
  async create(
    @Body() createNotificationDto: CreateNotificationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Post('test')
  @Roles('ADMIN')
  async createTestNotifications(@Request() req: AuthenticatedRequest) {
    const testNotifications = [
      {
        userId: req.user.id,
        title: 'Welcome to SendIT!',
        message:
          "Thank you for joining our delivery platform. We're excited to have you on board!",
        type: 'PARCEL_CREATED' as const,
        actionUrl: '/dashboard',
      },
      {
        userId: req.user.id,
        title: 'Parcel Assigned',
        message:
          'Your parcel #SIT123456 has been assigned to a driver and is ready for pickup.',
        type: 'PARCEL_ASSIGNED' as const,
        actionUrl: '/parcel/SIT123456',
        parcelId: 'test-parcel-1',
      },
      {
        userId: req.user.id,
        title: 'Parcel Picked Up',
        message:
          'Your parcel #SIT123456 has been picked up and is now in transit.',
        type: 'PARCEL_PICKED_UP' as const,
        actionUrl: '/parcel/SIT123456',
        parcelId: 'test-parcel-1',
      },
      {
        userId: req.user.id,
        title: 'Parcel Delivered',
        message:
          'Your parcel #SIT123456 has been successfully delivered to the recipient.',
        type: 'PARCEL_DELIVERED' as const,
        actionUrl: '/parcel/SIT123456',
        parcelId: 'test-parcel-1',
      },
      {
        userId: req.user.id,
        title: 'Parcel Completed',
        message:
          'Your parcel #SIT123456 has been marked as completed. You can now leave a review.',
        type: 'PARCEL_COMPLETED' as const,
        actionUrl: '/parcel/SIT123456',
        parcelId: 'test-parcel-1',
      },
    ];

    const createdNotifications: any[] = [];
    for (const notification of testNotifications) {
      try {
        const created = await this.notificationsService.create(notification);
        createdNotifications.push(created);
      } catch (error) {
        console.error('Error creating test notification:', error);
      }
    }

    return {
      message: `Created ${createdNotifications.length} test notifications`,
      notifications: createdNotifications,
    };
  }

  @Get()
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getUserNotifications(
    @Query() query: NotificationsQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return await this.notificationsService.getUserNotifications(
      req.user.id,
      query,
    );
  }

  @Get('summary')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getNotificationSummary(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.getNotificationSummary(req.user.id);
  }

  @Get(':id')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.notificationsService.findOne(id, req.user.id);
  }

  @Patch(':id/read')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async markAsRead(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @Patch('mark-all-read')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async delete(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    await this.notificationsService.delete(id, req.user.id);
    return { message: 'Notification deleted successfully' };
  }

  @Delete()
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async deleteAll(@Request() req: AuthenticatedRequest) {
    return this.notificationsService.deleteAll(req.user.id);
  }
}
