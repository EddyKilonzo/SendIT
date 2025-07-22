import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateParcelDto,
  UpdateParcelDto,
  ParcelQueryDto,
  ParcelResponseDto,
  ParcelStatusUpdateDto,
  DeliveryConfirmationDto,
} from './dto';
import { UserResponseDto } from '../users/dto';
import { ReviewResponseDto } from '../reviews/dto';

@Injectable()
export class ParcelsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create parcel
  async create(
    createParcelDto: CreateParcelDto,
    userId?: string,
  ): Promise<ParcelResponseDto> {
    const {
      senderName,
      senderEmail,
      senderPhone,
      recipientName,
      recipientEmail,
      recipientPhone,
      pickupAddress,
      deliveryAddress,
      weight,
      description,
      value,
      deliveryInstructions,
      priority = 'STANDARD',
    } = createParcelDto;

    // Generate unique tracking number
    const trackingNumber = await this.generateTrackingNumber();

    // Create parcel
    const parcel = await this.prisma.parcel.create({
      data: {
        trackingNumber,
        senderId: userId,
        senderName,
        senderEmail,
        senderPhone,
        recipientName,
        recipientEmail,
        recipientPhone,
        pickupAddress,
        deliveryAddress,
        weight,
        description,
        value,
        deliveryInstructions,
        priority,
        status: 'pending',
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
      },
    });

    return this.mapToParcelResponse(parcel);
  }

  // Find all parcels with filtering
  async findAll(
    query: ParcelQueryDto,
    userId?: string,
    userRole?: string,
  ): Promise<{
    parcels: ParcelResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      priority,
      dateFrom,
      dateTo,
      assignedToMe,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      deletedAt: null,
    };

    // Filter based on user role and permissions
    if (userRole === 'CUSTOMER' && userId) {
      where.OR = [{ senderId: userId }, { recipientId: userId }];
    } else if (userRole === 'DRIVER' && userId) {
      if (assignedToMe) {
        where.driverId = userId;
      } else {
        where.OR = [
          { driverId: userId },
          { status: 'pending' }, // Drivers can see unassigned parcels
        ];
      }
    }

    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { senderName: { contains: search, mode: 'insensitive' } },
        { recipientName: { contains: search, mode: 'insensitive' } },
        { pickupAddress: { contains: search, mode: 'insensitive' } },
        { deliveryAddress: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo);
      }
    }

    const [parcels, total] = await Promise.all([
      this.prisma.parcel.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sender: true,
          recipient: true,
          driver: true,
          statusHistory: {
            orderBy: { timestamp: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.parcel.count({ where }),
    ]);

    return {
      parcels: parcels.map((parcel) => this.mapToParcelResponse(parcel)),
      total,
      page,
      limit,
    };
  }

  // Find parcel by ID
  async findOne(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ParcelResponseDto> {
    const where: any = {
      id,
      deletedAt: null,
    };

    // Add role-based filtering
    if (userRole === 'CUSTOMER' && userId) {
      where.OR = [{ senderId: userId }, { recipientId: userId }];
    } else if (userRole === 'DRIVER' && userId) {
      where.OR = [{ driverId: userId }, { status: 'pending' }];
    }

    const parcel = await this.prisma.parcel.findFirst({
      where,
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
        reviews: {
          include: {
            reviewer: true,
            reviewee: true,
          },
        },
        deliveryProof: {
          include: {
            driver: true,
            recipient: true,
          },
        },
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    return this.mapToParcelResponse(parcel);
  }

  // Find parcel by tracking number
  async findByTrackingNumber(
    trackingNumber: string,
  ): Promise<ParcelResponseDto> {
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        trackingNumber,
        deletedAt: null,
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
        reviews: {
          include: {
            reviewer: true,
            reviewee: true,
          },
        },
        deliveryProof: {
          include: {
            driver: true,
            recipient: true,
          },
        },
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    return this.mapToParcelResponse(parcel);
  }

  // Update parcel
  async update(
    id: string,
    updateParcelDto: UpdateParcelDto,
    userId?: string,
    userRole?: string,
  ): Promise<ParcelResponseDto> {
    // Check if user has permission to update this parcel
    const existingParcel = await this.findOne(id, userId, userRole);

    const { description, value, deliveryInstructions, notes } = updateParcelDto;

    const updatedParcel = await this.prisma.parcel.update({
      where: { id },
      data: {
        description,
        value,
        deliveryInstructions,
        notes,
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    return this.mapToParcelResponse(updatedParcel);
  }

  // Update parcel status (for drivers)
  async updateStatus(
    id: string,
    statusUpdateDto: ParcelStatusUpdateDto,
    driverId: string,
  ): Promise<ParcelResponseDto> {
    const { status, currentLocation, latitude, longitude, notes } =
      statusUpdateDto;

    // Verify parcel is assigned to this driver
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id,
        driverId,
        deletedAt: null,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found or not assigned to you');
    }

    // Validate status transition
    if (!this.isValidStatusTransition(parcel.status, status)) {
      throw new BadRequestException(
        `Invalid status transition from ${parcel.status} to ${status}`,
      );
    }

    // Prepare update data
    const updateData: any = {
      status,
      currentLocation,
      latitude,
      longitude,
    };

    // Set timestamps based on status
    if (status === 'picked_up' && !parcel.actualPickupTime) {
      updateData.actualPickupTime = new Date();
    } else if (
      status === 'delivered_to_recipient' &&
      !parcel.actualDeliveryTime
    ) {
      updateData.actualDeliveryTime = new Date();
      updateData.deliveredToRecipient = true;
    }

    // Update parcel
    const updatedParcel = await this.prisma.parcel.update({
      where: { id },
      data: updateData,
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    // Create status history entry
    await this.prisma.parcelStatusHistory.create({
      data: {
        parcelId: id,
        status,
        location: currentLocation,
        latitude,
        longitude,
        updatedBy: driverId,
        notes,
      },
    });

    return this.mapToParcelResponse(updatedParcel);
  }

  // Confirm delivery (for recipients)
  async confirmDelivery(
    id: string,
    confirmationDto: DeliveryConfirmationDto,
    recipientId: string,
  ): Promise<ParcelResponseDto> {
    const { customerSignature, customerNotes } = confirmationDto;

    // Verify parcel is assigned to this recipient
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id,
        recipientId,
        status: 'delivered_to_recipient',
        deletedAt: null,
      },
    });

    if (!parcel) {
      throw new NotFoundException(
        'Parcel not found or not ready for confirmation',
      );
    }

    // Update parcel status
    const updatedParcel = await this.prisma.parcel.update({
      where: { id },
      data: {
        status: 'delivered',
        deliveryConfirmedAt: new Date(),
        deliveryConfirmedBy: recipientId,
        customerSignature,
        customerNotes,
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    // Create delivery proof
    await this.prisma.deliveryProof.create({
      data: {
        parcelId: id,
        customerSignature,
        recipientName: parcel.recipientName,
        deliveredAt: parcel.actualDeliveryTime || new Date(),
        confirmedAt: new Date(),
        deliveredBy: parcel.driverId!,
        confirmedBy: recipientId,
        customerNotes,
      },
    });

    // Create status history entry
    await this.prisma.parcelStatusHistory.create({
      data: {
        parcelId: id,
        status: 'delivered',
        location: parcel.currentLocation,
        latitude: parcel.latitude,
        longitude: parcel.longitude,
        updatedBy: recipientId,
        notes: 'Delivery confirmed by recipient',
      },
    });

    return this.mapToParcelResponse(updatedParcel);
  }

  // Cancel parcel
  async cancel(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ParcelResponseDto> {
    // Check if user has permission to cancel this parcel
    const existingParcel = await this.findOne(id, userId, userRole);

    // Only allow cancellation if parcel is still pending or assigned
    if (!['pending', 'assigned'].includes(existingParcel.status)) {
      throw new BadRequestException(
        'Cannot cancel parcel that is already in transit or delivered',
      );
    }

    const updatedParcel = await this.prisma.parcel.update({
      where: { id },
      data: {
        status: 'cancelled',
        driverId: null,
        assignedAt: null,
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    // Create status history entry
    await this.prisma.parcelStatusHistory.create({
      data: {
        parcelId: id,
        status: 'cancelled',
        updatedBy: userId,
        notes: 'Parcel cancelled',
      },
    });

    return this.mapToParcelResponse(updatedParcel);
  }

  // Get parcel status history
  async getStatusHistory(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<any[]> {
    // Check if user has permission to view this parcel
    await this.findOne(id, userId, userRole);

    const statusHistory = await this.prisma.parcelStatusHistory.findMany({
      where: {
        parcelId: id,
      },
      orderBy: { timestamp: 'desc' },
      include: {
        updatedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return statusHistory;
  }

  // Get user's parcels (for customers)
  async getUserParcels(
    userId: string,
    type: 'sent' | 'received' = 'sent',
  ): Promise<ParcelResponseDto[]> {
    const where: any = {
      deletedAt: null,
    };

    if (type === 'sent') {
      where.senderId = userId;
    } else {
      where.recipientId = userId;
    }

    const parcels = await this.prisma.parcel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    return parcels.map((parcel) => this.mapToParcelResponse(parcel));
  }

  // Get driver's assigned parcels
  async getDriverParcels(
    driverId: string,
    status?: string,
  ): Promise<ParcelResponseDto[]> {
    const where: any = {
      driverId,
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    const parcels = await this.prisma.parcel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    return parcels.map((parcel) => this.mapToParcelResponse(parcel));
  }

  // Helper methods
  private async generateTrackingNumber(): Promise<string> {
    const prefix = 'SENDIT';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();

    const trackingNumber = `${prefix}${timestamp}${random}`;

    // Check if tracking number already exists
    const existing = await this.prisma.parcel.findUnique({
      where: { trackingNumber },
    });

    if (existing) {
      // Recursively generate a new one if collision
      return this.generateTrackingNumber();
    }

    return trackingNumber;
  }

  private isValidStatusTransition(
    currentStatus: string,
    newStatus: string,
  ): boolean {
    const validTransitions: Record<string, string[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['picked_up', 'cancelled'],
      picked_up: ['in_transit', 'cancelled'],
      in_transit: ['delivered_to_recipient', 'cancelled'],
      delivered_to_recipient: ['delivered'],
      delivered: [], // Final state
      cancelled: [], // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  private mapToParcelResponse(parcel: any): ParcelResponseDto {
    return {
      id: parcel.id,
      trackingNumber: parcel.trackingNumber,
      senderId: parcel.senderId,
      senderName: parcel.senderName,
      senderEmail: parcel.senderEmail,
      senderPhone: parcel.senderPhone,
      recipientId: parcel.recipientId,
      recipientName: parcel.recipientName,
      recipientEmail: parcel.recipientEmail,
      recipientPhone: parcel.recipientPhone,
      driverId: parcel.driverId,
      assignedAt: parcel.assignedAt,
      pickupAddress: parcel.pickupAddress,
      deliveryAddress: parcel.deliveryAddress,
      currentLocation: parcel.currentLocation,
      status: parcel.status,
      weight: parcel.weight,
      description: parcel.description,
      value: parcel.value,
      deliveryInstructions: parcel.deliveryInstructions,
      notes: parcel.notes,
      latitude: parcel.latitude,
      longitude: parcel.longitude,
      estimatedPickupTime: parcel.estimatedPickupTime,
      actualPickupTime: parcel.actualPickupTime,
      estimatedDeliveryTime: parcel.estimatedDeliveryTime,
      actualDeliveryTime: parcel.actualDeliveryTime,
      totalDeliveryTime: parcel.totalDeliveryTime,
      deliveryAttempts: parcel.deliveryAttempts,
      priority: parcel.priority,
      deliveryFee: parcel.deliveryFee,
      paymentStatus: parcel.paymentStatus,
      deliveredToRecipient: parcel.deliveredToRecipient,
      deliveryConfirmedAt: parcel.deliveryConfirmedAt,
      deliveryConfirmedBy: parcel.deliveryConfirmedBy,
      customerSignature: parcel.customerSignature,
      customerNotes: parcel.customerNotes,
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
      sender: parcel.sender ? this.mapToUserResponse(parcel.sender) : undefined,
      recipient: parcel.recipient
        ? this.mapToUserResponse(parcel.recipient)
        : undefined,
      driver: parcel.driver ? this.mapToUserResponse(parcel.driver) : undefined,
      statusHistory: parcel.statusHistory || [],
      reviews: parcel.reviews || [],
      deliveryProof: parcel.deliveryProof || null,
    };
  }

  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      role: user.role,
      isActive: user.isActive,
      licenseNumber: user.licenseNumber,
      vehicleNumber: user.vehicleNumber,
      vehicleType: user.vehicleType,
      isAvailable: user.isAvailable,
      currentLat: user.currentLat,
      currentLng: user.currentLng,
      averageRating: user.averageRating,
      totalRatings: user.totalRatings,
      totalDeliveries: user.totalDeliveries,
      completedDeliveries: user.completedDeliveries,
      cancelledDeliveries: user.cancelledDeliveries,
      averageDeliveryTime: user.averageDeliveryTime,
      onTimeDeliveryRate: user.onTimeDeliveryRate,
      lastActiveAt: user.lastActiveAt,
      totalEarnings: user.totalEarnings,
      totalParcelsEverSent: user.totalParcelsEverSent,
      totalParcelsReceived: user.totalParcelsReceived,
      preferredPaymentMethod: user.preferredPaymentMethod,
      driverApplicationStatus: user.driverApplicationStatus,
      driverApplicationDate: user.driverApplicationDate,
      driverApprovalDate: user.driverApprovalDate,
      driverRejectionReason: user.driverRejectionReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
