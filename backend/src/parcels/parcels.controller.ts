import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import {
  CreateParcelDto,
  UpdateParcelDto,
  ParcelQueryDto,
  ParcelStatusUpdateDto,
  DeliveryConfirmationDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

interface AuthenticatedRequest {
  user: {
    id: string;
    role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  };
}

@Controller('parcels')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  @Roles('ADMIN')
  async create(
    @Body() createParcelDto: CreateParcelDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.create(createParcelDto, req.user.id);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(
    @Query() query: ParcelQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.findAll(query, req.user.id, req.user.role);
  }

  @Get('tracking/:trackingNumber')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async findByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.parcelsService.findByTrackingNumber(trackingNumber);
  }

  @Get('my-parcels')
  @Roles('CUSTOMER')
  async getMyParcels(
    @Query('type') type: 'sent' | 'received' = 'sent',
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.getUserParcels(req.user.id, type);
  }

  @Get('assigned')
  @Roles('DRIVER')
  async getAssignedParcels(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.parcelsService.getDriverParcels(req.user.id, status);
  }

  @Get('status-history/:id')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getStatusHistory(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.getStatusHistory(id, req.user.id, req.user.role);
  }

  @Get(':id')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.parcelsService.findOne(id, req.user.id, req.user.role);
  }

  @Patch(':id')
  @Roles('CUSTOMER', 'ADMIN')
  async update(
    @Param('id') id: string,
    @Body() updateParcelDto: UpdateParcelDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.update(
      id,
      updateParcelDto,
      req.user.id,
      req.user.role,
    );
  }

  @Patch(':id/status')
  @Roles('DRIVER')
  async updateStatus(
    @Param('id') id: string,
    @Body() statusUpdateDto: ParcelStatusUpdateDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.updateStatus(id, statusUpdateDto, req.user.id);
  }

  @Patch(':id/confirm-delivery')
  @Roles('CUSTOMER')
  async confirmDelivery(
    @Param('id') id: string,
    @Body() confirmationDto: DeliveryConfirmationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.confirmDelivery(
      id,
      confirmationDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @Roles('CUSTOMER', 'ADMIN')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.parcelsService.cancel(id, req.user.id, req.user.role);
  }
}
