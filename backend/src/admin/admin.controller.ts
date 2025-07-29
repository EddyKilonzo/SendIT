import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Request,
  UseGuards,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import {
  DashboardStatsDto,
  SystemStatsDto,
  AssignParcelToDriverDto,
  BulkAssignParcelsDto,
  DriverManagementDto,
  UserManagementDto,
  DriverApplicationManagementDto,
  ParcelManagementDto,
  DriverFilterDto,
  ParcelFilterDto,
  UserFilterDto,
  DriverApplicationFilterDto,
} from './dto/admin.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { PrismaService } from '../database/prisma.service';

// Define request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService, private readonly prisma: PrismaService) {}

  // Dashboard and Statistics
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/system-stats')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('analytics')
  async getAnalyticsData() {
    return this.adminService.getAnalyticsData();
  }

  // User Management
  @Get('users')
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllUsers(
    @Query() query: UserFilterDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.adminService.findAllUsers(query);
  }

  @Get('users/all-for-dropdown')
  async getAllUsersForDropdown() {
    return this.adminService.getAllUsersForDropdown();
  }

  @Get('users/test-suspended-inclusion')
  async testSuspendedUserInclusion() {
    const result = await this.adminService.getAllUsersForDropdown();
    const suspendedUsers = result.users.filter(user => !user.isActive);
    const activeUsers = result.users.filter(user => user.isActive);
    
    return {
      message: 'Suspended users are now included in dropdown',
      totalUsers: result.users.length,
      activeUsers: activeUsers.length,
      suspendedUsers: suspendedUsers.length,
      suspendedUsersList: suspendedUsers.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      })),
    };
  }

  @Get('users/debug-all-users')
  async debugAllUsers() {
    return this.adminService.debugAllUsers();
  }

  @Post('users/create-test-suspended')
  @Roles('ADMIN')
  async createTestSuspendedUser() {
    try {
      const testUser = await this.adminService.createTestSuspendedUser();
      return {
        success: true,
        data: testUser,
        message: 'Test suspended user created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create test suspended user',
        error: error.message,
      };
    }
  }

  @Post('users/:id/add-test-profile-picture')
  @Roles('ADMIN')
  async addTestProfilePicture(@Param('id') userId: string) {
    try {
      // Add a test profile picture URL to the user
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
        }
      });
      
      return {
        success: true,
        data: updatedUser,
        message: 'Test profile picture added successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to add test profile picture',
        error: error.message,
      };
    }
  }

  @Get('debug/notifications')
  @Roles('ADMIN')
  async debugNotifications() {
    try {
      // Get all notifications with user info
      const notifications = await this.prisma.notification.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 20
      });
      
      return {
        success: true,
        data: {
          totalNotifications: notifications.length,
          notifications: notifications.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
            user: n.user
          }))
        },
        message: 'Notifications debug info retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get notifications debug info',
        error: error.message,
      };
    }
  }

  @Get('users/:id')
  async findUserById(@Param('id') id: string) {
    return this.adminService.findUserById(id);
  }

  @Get('users/:id/parcels')
  async getUserParcels(@Param('id') id: string) {
    return this.adminService.getUserParcels(id);
  }

  @Get('users/:id/activity')
  async getUserActivity(@Param('id') id: string) {
    return this.adminService.getUserActivity(id);
  }

  @Get('users/:id/driver-data')
  async getDriverComprehensiveData(@Param('id') id: string) {
    return this.adminService.getDriverComprehensiveData(id);
  }

  @Patch('users/:id/manage')
  async manageUser(
    @Param('id') userId: string,
    @Body() managementDto: UserManagementDto,
  ) {
    return this.adminService.manageUser(userId, managementDto);
  }

  @Patch('users/:id/reactivate')
  async reactivateUser(@Param('id') userId: string) {
    return this.adminService.manageUser(userId, {
      userId,
      action: 'unsuspend',
      reason: 'User reactivated by admin',
    });
  }

  // Driver Management
  @Get('drivers')
  async findAllDrivers(@Query() query: DriverFilterDto) {
    return this.adminService.findAllDrivers(query);
  }

  @Patch('drivers/:id/manage')
  async manageDriver(
    @Param('id') driverId: string,
    @Body() managementDto: DriverManagementDto,
  ) {
    return this.adminService.manageDriver(driverId, managementDto);
  }

  // Driver Applications
  @Get('driver-applications')
  async getDriverApplications(@Query() query: DriverApplicationFilterDto) {
    return this.adminService.getDriverApplications(query);
  }

  @Patch('driver-applications/:id/manage')
  async manageDriverApplication(
    @Param('id') userId: string,
    @Body() managementDto: DriverApplicationManagementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    try {
      console.log('🔍 Backend Controller - manageDriverApplication called');
      console.log('🔍 Backend Controller - User ID from URL:', userId);
      console.log('🔍 Backend Controller - Request body:', JSON.stringify(managementDto, null, 2));
      console.log('🔍 Backend Controller - Request user:', req.user);

      const result = await this.adminService.manageDriverApplication(
        userId,
        managementDto,
        req.user?.id || 'admin'
      );

      console.log('🔍 Backend Controller - Service result:', {
        id: result.id,
        name: result.name,
        role: result.role,
        driverApplicationStatus: result.driverApplicationStatus,
      });

      return result;
    } catch (error) {
      console.error('❌ Backend Controller - Error in manageDriverApplication:', error);
      console.error('❌ Backend Controller - Error message:', error.message);
      console.error('❌ Backend Controller - Error stack:', error.stack);
      throw error;
    }
  }

  // Parcel Management
  @Get('parcels')
  async findAllParcels(@Query() query: ParcelFilterDto) {
    return this.adminService.findAllParcels(query);
  }

  @Get('parcels/:id')
  async findParcelById(@Param('id') id: string) {
    return this.adminService.findParcelById(id);
  }

  @Patch('parcels/:id/manage')
  async manageParcel(
    @Param('id') parcelId: string,
    @Body() managementDto: ParcelManagementDto,
  ) {
    return this.adminService.manageParcel(parcelId, managementDto);
  }

  @Post('parcels/assign')
  async assignParcelToDriver(@Body() assignmentDto: AssignParcelToDriverDto) {
    return this.adminService.assignParcelToDriver(assignmentDto);
  }

  @Post('parcels/bulk-assign')
  async bulkAssignParcels(@Body() bulkAssignmentDto: BulkAssignParcelsDto) {
    return this.adminService.bulkAssignParcels(bulkAssignmentDto);
  }
}
