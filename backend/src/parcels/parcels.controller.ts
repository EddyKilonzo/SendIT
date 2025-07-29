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
  MarkAsCompletedDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
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
    return this.parcelsService.create(createParcelDto, req.user.sub);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(
    @Query() query: ParcelQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.findAll(query, req.user.sub, req.user.role);
  }

  @Get('tracking/:trackingNumber')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async findByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.parcelsService.findByTrackingNumber(trackingNumber);
  }

  @Get('anonymous/:email')
  async getAnonymousParcels(@Param('email') email: string) {
    return this.parcelsService.getAnonymousParcelsByEmail(email);
  }

  @Post('link-parcel/:id')
  @Roles('ADMIN')
  async linkParcelToUsers(
    @Param('id') parcelId: string,
    @Body() linkData: { senderId?: string; recipientId?: string },
  ): Promise<{
    success: boolean;
    message: string;
    updatedParcel?: any;
  }> {
    const result = await this.parcelsService.linkParcelToUsers(
      parcelId,
      linkData.senderId,
      linkData.recipientId,
    );
    return result;
  }

  @Post('link-by-email')
  @Roles('ADMIN')
  async linkParcelsByEmail(
    @Body()
    linkData: {
      userEmail: string;
      userId: string;
      linkType?: 'sender' | 'recipient' | 'both';
    },
  ): Promise<{
    success: boolean;
    linkedParcels: number;
    message: string;
  }> {
    try {
      return (await this.parcelsService.linkParcelsByEmail(
        linkData.userEmail,
        linkData.userId,
        linkData.linkType || 'both',
      )) as {
        success: boolean;
        linkedParcels: number;
        message: string;
      };
    } catch {
      return {
        success: false,
        linkedParcels: 0,
        message: 'Failed to link parcels by email.',
      };
    }
  }

  @Get('suggestions/autocomplete')
  async getAutocompleteSuggestions(
    @Query('q') query: string,
    @Query('type') type: 'name' | 'email' | 'phone' = 'name',
    @Query('limit') limit: number = 10,
  ) {
    return this.parcelsService.getAutocompleteSuggestions(query, type, limit);
  }

  @Get('calculate-delivery-fee')
  calculateDeliveryFee(
    @Query('weight') weight: number,
    @Query('pickupAddress') pickupAddress: string,
    @Query('deliveryAddress') deliveryAddress: string,
  ): number {
    try {
      return this.parcelsService.calculateDeliveryFee(
        weight,
        pickupAddress,
        deliveryAddress,
      ) as number;
    } catch {
      return 0;
    }
  }

  @Get('suggestions/contact/:type')
  async getContactSuggestions(
    @Param('type') contactType: 'sender' | 'recipient',
    @Query('q') query: string,
    @Query('limit') limit: number = 10,
    @Query('excludeRoles') excludeRoles?: string,
  ) {
    const excludeRolesArray = excludeRoles 
      ? (excludeRoles.split(',') as ('CUSTOMER' | 'DRIVER' | 'ADMIN')[])
      : ['DRIVER', 'ADMIN'] as ('CUSTOMER' | 'DRIVER' | 'ADMIN')[];
    return this.parcelsService.getContactSuggestions(query, contactType, limit, excludeRolesArray);
  }

  @Get('my-parcels')
  @Roles('CUSTOMER')
  async getMyParcels(
    @Query('type') type: 'sent' | 'received' = 'sent',
    @Request() req: AuthenticatedRequest,
  ) {
    console.log(
      `🔍 API Request - getMyParcels(type: ${type}, userId: ${req.user.sub})`,
    );
    console.log(`📋 Query parameters:`, { type });
    console.log(`👤 User details:`, { id: req.user.sub, role: req.user.role });

    const result = await this.parcelsService.getUserParcels(req.user.sub, type);
    console.log(
      `📦 API Response - getMyParcels(${type}): ${result.length} parcels`,
    );

    // Log the first parcel details if any
    if (result.length > 0) {
      const firstParcel = result[0];
      console.log(`📦 First parcel:`, {
        id: firstParcel.id,
        trackingNumber: firstParcel.trackingNumber,
        senderId: firstParcel.senderId,
        recipientId: firstParcel.recipientId,
        senderName: firstParcel.senderName,
        recipientName: firstParcel.recipientName,
      });
    }

    return result;
  }

  @Get('assigned')
  @Roles('DRIVER')
  async getAssignedParcels(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.parcelsService.getDriverParcels(req.user.sub, status);
  }

  @Get('status-history/:id')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getStatusHistory(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.getStatusHistory(
      id,
      req.user.sub,
      req.user.role,
    );
  }

  @Get(':id')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.parcelsService.findOne(id, req.user.sub, req.user.role);
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
      req.user.sub,
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
    return this.parcelsService.updateStatus(id, statusUpdateDto, req.user.sub);
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
      req.user.sub,
    );
  }

  @Patch(':id/mark-as-completed')
  @Roles('CUSTOMER')
  async markAsCompleted(
    @Param('id') id: string,
    @Body() markAsCompletedDto: MarkAsCompletedDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.parcelsService.markAsCompleted(
      id,
      markAsCompletedDto,
      req.user.sub,
    );
  }

  @Delete(':id')
  @Roles('CUSTOMER', 'ADMIN')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.parcelsService.cancel(id, req.user.sub, req.user.role);
  }
}
