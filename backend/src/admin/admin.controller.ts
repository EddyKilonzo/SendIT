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
import { driverApplicationManagementSchema } from './dto/admin.schemas';
import { createJoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Define request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

@Controller('admin')
// @UseGuards(JwtAuthGuard) // Temporarily commented out for debugging
// @Roles('ADMIN') // Temporarily commented out for debugging
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Dashboard and Statistics
  @Get('dashboard/stats')
  @UseGuards(JwtAuthGuard)
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  @Get('dashboard/system-stats')
  async getSystemStats() {
    return this.adminService.getSystemStats();
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  async getAnalyticsData() {
    return this.adminService.getAnalyticsData();
  }

  // Temporary debug endpoint (no auth required)
  @Get('debug/db')
  @UseGuards() // Remove all guards temporarily
  async debugDatabase() {
    return this.adminService.debugDatabase();
  }

  // Debug endpoint to check database
  @Get('debug/users')
  async debugUsers() {
    const totalUsers = await this.adminService.debugUsers();
    return { totalUsers };
  }

  @Get('debug/user/:id/driver-status')
  async debugUserDriverStatus(@Param('id') userId: string) {
    const user = await this.adminService.findUserById(userId);
    return {
      userId,
      driverApplicationStatus: user.driverApplicationStatus,
      role: user.role,
      driverApplicationDate: user.driverApplicationDate,
      driverRejectionReason: user.driverRejectionReason
    };
  }

  // User Management
  @Get('users')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async findAllUsers(
    @Query() query: UserFilterDto,
    @Request() req: AuthenticatedRequest,
  ) {
    console.log(
      '🔍 Backend Controller - findAllUsers called with query:',
      query,
    );
    console.log('🔍 Backend Controller - User making request:', req.user);
    console.log('🔍 Backend Controller - Request headers:', req.headers);
    return this.adminService.findAllUsers(query);
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

  @Patch('users/:id/manage')
  @UseGuards(JwtAuthGuard)
  async manageUser(
    @Param('id') userId: string,
    @Body() managementDto: UserManagementDto,
  ) {
    return this.adminService.manageUser(userId, managementDto);
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

  // Driver Application Management
  @Get('driver-applications')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getDriverApplications(@Query() query: DriverApplicationFilterDto) {
    console.log(
      'AdminController - getDriverApplications called with query:',
      query,
    );
    return this.adminService.getDriverApplications(query);
  }

  @Patch('driver-applications/:id/manage')
  @UseGuards(JwtAuthGuard)
  async manageDriverApplication(
    @Param('id') userId: string,
    @Body() managementDto: any,
    @Request() req: AuthenticatedRequest,
  ) {
    console.log('🔍 DEBUG - manageDriverApplication called');
    console.log('🔍 DEBUG - URL userId:', userId);
    console.log('🔍 DEBUG - Raw request body:', JSON.stringify(managementDto, null, 2));
    console.log('🔍 DEBUG - Request headers:', req.headers);
    console.log('🔍 DEBUG - User from token:', req.user);
    
    // Manual validation
    const validationResult = driverApplicationManagementSchema.validate(managementDto, {
      abortEarly: false,
      stripUnknown: true,
    });
    
    if (validationResult.error) {
      console.log('🔍 DEBUG - Manual validation failed:', validationResult.error.details);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validationResult.error.details.map(detail => detail.message),
      });
    }
    
    console.log('🔍 DEBUG - Manual validation passed:', validationResult.value);
    
    return this.adminService.manageDriverApplication(
      userId,
      validationResult.value,
      req.user?.id || 'admin',
    );
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

  // Parcel Assignment
  @Post('parcels/assign')
  async assignParcelToDriver(@Body() assignmentDto: AssignParcelToDriverDto) {
    return this.adminService.assignParcelToDriver(assignmentDto);
  }

  @Post('parcels/bulk-assign')
  async bulkAssignParcels(@Body() bulkAssignmentDto: BulkAssignParcelsDto) {
    return this.adminService.bulkAssignParcels(bulkAssignmentDto);
  }
}
