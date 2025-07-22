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
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import {
  UpdateLocationDto,
  UpdateAvailabilityDto,
  DriverApplicationDto,
  AssignParcelDto,
  UpdateParcelStatusDto,
} from '../users/dto';
import { IdParamDto } from '../common/dto';
import { createJoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  updateLocationSchema,
  updateAvailabilitySchema,
  assignParcelSchema,
  updateParcelStatusSchema,
} from '../users/dto/driver.schemas';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  findAll(@Query() query: any) {
    return this.driversService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.driversService.findOne(params.id);
  }

  @Get(':id/performance')
  getDriverPerformance(@Param() params: IdParamDto) {
    return this.driversService.getDriverPerformance(params.id);
  }

  @Patch(':id/location')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateLocationSchema))
  updateLocation(
    @Param() params: IdParamDto,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.driversService.updateLocation(params.id, updateLocationDto);
  }

  @Patch(':id/availability')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateAvailabilitySchema))
  updateAvailability(
    @Param() params: IdParamDto,
    @Body() updateAvailabilityDto: UpdateAvailabilityDto,
  ) {
    return this.driversService.updateAvailability(
      params.id,
      updateAvailabilityDto,
    );
  }

  @Post('apply')
  @HttpCode(HttpStatus.CREATED)
  applyForDriver(@Body() driverApplicationDto: DriverApplicationDto) {
    // This would typically get the user ID from the JWT token
    // For now, we'll need to pass it in the body or use a different approach
    return {
      message: 'Driver application endpoint - needs user ID from token',
    };
  }

  @Post('assign-parcel')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(assignParcelSchema))
  assignParcel(@Body() assignParcelDto: AssignParcelDto) {
    return this.driversService.assignParcel(assignParcelDto);
  }

  @Patch('parcels/:parcelId/status')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateParcelStatusSchema))
  updateParcelStatus(
    @Param('parcelId') parcelId: string,
    @Body() updateParcelStatusDto: UpdateParcelStatusDto,
  ) {
    // This would typically get the driver ID from the JWT token
    // For now, we'll need to pass it in the body or use a different approach
    return {
      message: 'Update parcel status endpoint - needs driver ID from token',
    };
  }

  // Admin endpoints for managing driver applications
  @Post('applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  approveDriverApplication(@Param('id') driverId: string) {
    // This would typically get the admin ID from the JWT token
    const adminId = 'admin-id'; // Placeholder
    return this.driversService.approveDriverApplication(driverId, adminId);
  }

  @Post('applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  rejectDriverApplication(
    @Param('id') driverId: string,
    @Body() body: { reason: string },
  ) {
    // This would typically get the admin ID from the JWT token
    const adminId = 'admin-id'; // Placeholder
    return this.driversService.rejectDriverApplication(
      driverId,
      adminId,
      body.reason,
    );
  }
}
