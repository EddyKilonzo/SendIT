import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import {
  UpdateLocationDto,
  DriverApplicationDto,
  AssignParcelDto,
  UpdateParcelStatusDto,
} from '../users/dto';
import { IdParamDto } from '../common/dto';
import { createJoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  driverApplicationSchema,
  updateLocationSchema,
  assignParcelSchema,
  updateParcelStatusSchema,
} from '../users/dto/driver.schemas';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

// Import the response types from the service
interface DriverPerformanceResponse {
  driverId: string;
  driverName: string;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageRating: number;
  totalRatings: number;
  totalEarnings: number;
  onTimeDeliveryRate: number;
  averageDeliveryTime: number;
  lastActiveAt: Date | null;
}

interface AssignParcelResponse {
  message: string;
  parcel: any;
  driver: any;
}

interface UpdateParcelStatusResponse {
  message: string;
  parcel: any;
}

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles('ADMIN')
  findAll(
    @Query()
    query: {
      page?: number;
      limit?: number;
      search?: string;
      isAvailable?: boolean;
      vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
      driverApplicationStatus?:
        | 'NOT_APPLIED'
        | 'PENDING'
        | 'APPROVED'
        | 'REJECTED';
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      minimumRating?: number;
    },
  ) {
    return this.driversService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param() params: IdParamDto) {
    return this.driversService.findOne(params.id);
  }

  @Get(':id/performance')
  @Roles('ADMIN')
  getDriverPerformance(
    @Param() params: IdParamDto,
  ): Promise<DriverPerformanceResponse> {
    return this.driversService.getDriverPerformance(params.id);
  }

  @Patch(':id/location')
  @Roles('DRIVER')
  @UsePipes(createJoiValidationPipe(updateLocationSchema))
  updateLocation(
    @Param() params: IdParamDto,
    @Body() updateLocationDto: UpdateLocationDto,
    @Request() req: { user: { sub: string } },
  ) {
    // Ensure driver can only update their own location
    if (req.user.sub !== params.id) {
      throw new BadRequestException('You can only update your own location');
    }
    
    return this.driversService.updateLocation(params.id, updateLocationDto);
  }

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  @UsePipes(createJoiValidationPipe(driverApplicationSchema))
  @Roles('CUSTOMER', 'ADMIN')
  applyForDriver(
    @Body() driverApplicationDto: DriverApplicationDto,
    @Request() req: { user: { sub: string } },
  ) {
    return this.driversService.applyForDriver(
      req.user.sub,
      driverApplicationDto,
    );
  }

  @Post('assign-parcel')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(assignParcelSchema))
  @Roles('ADMIN')
  assignParcel(
    @Body() assignParcelDto: AssignParcelDto,
  ): Promise<AssignParcelResponse> {
    return this.driversService.assignParcel(assignParcelDto);
  }

  @Patch('parcels/:parcelId/status')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateParcelStatusSchema))
  @Roles('DRIVER')
  updateParcelStatus(
    @Param('parcelId') parcelId: string,
    @Body() updateParcelStatusDto: UpdateParcelStatusDto,
    @Request() req: { user: { sub: string } },
  ): Promise<UpdateParcelStatusResponse> {
    return this.driversService.updateParcelStatus(
      parcelId,
      req.user.sub,
      updateParcelStatusDto,
    );
  }

  // Admin endpoints for managing driver applications
  @Post('applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  approveDriverApplication(
    @Param('id') driverId: string,
    @Request() req: { user: { sub: string } },
  ) {
    return this.driversService.approveDriverApplication(driverId, req.user.sub);
  }

  @Post('applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  rejectDriverApplication(
    @Param('id') driverId: string,
    @Body() body: { reason: string },
    @Request() req: { user: { sub: string } },
  ) {
    return this.driversService.rejectDriverApplication(
      driverId,
      req.user.sub,
      body.reason,
    );
  }
}
