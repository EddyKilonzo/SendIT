import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Request,
} from '@nestjs/common';

// Define request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}
import { AdminService } from './admin.service';
import {
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
} from './dto';

@Controller('admin')
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

  // User Management
  @Get('users')
  async findAllUsers(@Query() query: UserFilterDto) {
    return this.adminService.findAllUsers(query);
  }

  @Get('users/:id')
  async findUserById(@Param('id') id: string) {
    return this.adminService.findUserById(id);
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

  // Driver Application Management
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
    return this.adminService.manageDriverApplication(
      userId,
      managementDto,
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
