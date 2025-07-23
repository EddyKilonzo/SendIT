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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

@Controller('drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles('ADMIN')
  findAll(@Query() query: any) {
    return this.driversService.findAll(query);
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param() params: IdParamDto) {
    return this.driversService.findOne(params.id);
  }

  @Get(':id/performance')
  @Roles('ADMIN')
  getDriverPerformance(@Param() params: IdParamDto) {
    return this.driversService.getDriverPerformance(params.id);
  }

  @Patch(':id/location')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateLocationSchema))
  @Roles('DRIVER')
  updateLocation(
    @Param() params: IdParamDto,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.driversService.updateLocation(params.id, updateLocationDto);
  }

  @Patch(':id/availability')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateAvailabilitySchema))
  @Roles('DRIVER')
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
  @Roles('CUSTOMER')
  applyForDriver(
    @Body() driverApplicationDto: DriverApplicationDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.driversService.applyForDriver(
      req.user.id,
      driverApplicationDto,
    );
  }

  @Post('assign-parcel')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(assignParcelSchema))
  @Roles('ADMIN')
  assignParcel(@Body() assignParcelDto: AssignParcelDto) {
    return this.driversService.assignParcel(assignParcelDto);
  }

  @Patch('parcels/:parcelId/status')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateParcelStatusSchema))
  @Roles('DRIVER')
  updateParcelStatus(
    @Param('parcelId') parcelId: string,
    @Body() updateParcelStatusDto: UpdateParcelStatusDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.driversService.updateParcelStatus(
      parcelId,
      req.user.id,
      updateParcelStatusDto,
    );
  }

  // Admin endpoints for managing driver applications
  @Post('applications/:id/approve')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  approveDriverApplication(
    @Param('id') driverId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.driversService.approveDriverApplication(driverId, req.user.id);
  }

  @Post('applications/:id/reject')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  rejectDriverApplication(
    @Param('id') driverId: string,
    @Body() body: { reason: string },
    @Request() req: { user: { id: string } },
  ) {
    return this.driversService.rejectDriverApplication(
      driverId,
      req.user.id,
      body.reason,
    );
  }
}
