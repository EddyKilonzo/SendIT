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
import { assignParcelToDriverSchema } from './dto/admin.schemas';

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
  constructor(private readonly adminService: AdminService) {}

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
  @UsePipes(createJoiValidationPipe(driverApplicationManagementSchema))
  async manageDriverApplication(
    @Param('id') userId: string,
    @Body() managementDto: DriverApplicationManagementDto,
    @Request() req: AuthenticatedRequest,
  ) {
    console.log('🔍 Backend Controller - manageDriverApplication called');
    console.log('🔍 Backend Controller - User ID:', userId);
    console.log('🔍 Backend Controller - Management DTO:', managementDto);
    console.log('🔍 Backend Controller - Request user:', req.user);

    return this.adminService.manageDriverApplication(
      userId,
      managementDto,
      req.user?.id || 'admin'
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

  @Post('parcels/assign')
  @UsePipes(createJoiValidationPipe(assignParcelToDriverSchema))
  async assignParcelToDriver(@Body() assignmentDto: AssignParcelToDriverDto) {
    return this.adminService.assignParcelToDriver(assignmentDto);
  }

  @Post('parcels/bulk-assign')
  async bulkAssignParcels(@Body() bulkAssignmentDto: BulkAssignParcelsDto) {
    return this.adminService.bulkAssignParcels(bulkAssignmentDto);
  }
}
