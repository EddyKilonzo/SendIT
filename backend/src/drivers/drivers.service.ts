import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import {
  UpdateLocationDto,
  DriverApplicationDto,
  DriverApplicationResponseDto,
  UserResponseDto,
  AssignParcelDto,
  UpdateParcelStatusDto,
} from '../users/dto';
import { DriversGateway } from './drivers.gateway';
import { MailerService } from '../mailer/mailer.service';

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
  parcel: any; // This will be the Prisma Parcel type
  driver: UserResponseDto;
}

interface UpdateParcelStatusResponse {
  message: string;
  parcel: any; // This will be the Prisma Parcel type
}

@Injectable()
export class DriversService {
  private readonly logger = new Logger(DriversService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly driversGateway: DriversGateway,
    private readonly mailerService: MailerService,
  ) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
    driverApplicationStatus?:
      | 'NOT_APPLIED'
      | 'PENDING'
      | 'APPROVED'
      | 'REJECTED';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    minimumRating?: number;
  }): Promise<{
    drivers: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      vehicleType,
      driverApplicationStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minimumRating,
    } = query;

    // Convert string parameters to proper types
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    const skip = (pageNum - 1) * limitNum;

    // Build where clause with proper typing
    const where: Prisma.UserWhereInput = {
      role: 'DRIVER',
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (vehicleType) {
      where.vehicleType = vehicleType;
    }

    if (driverApplicationStatus) {
      where.driverApplicationStatus = driverApplicationStatus;
    }

    if (minimumRating) {
      where.averageRating = {
        gte: minimumRating,
      };
    }

    // Build order by clause
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (sortBy === 'averageRating') {
      orderBy.averageRating = sortOrder;
    } else if (sortBy === 'totalDeliveries') {
      orderBy.totalDeliveries = sortOrder;
    } else if (sortBy === 'name') {
      orderBy.name = sortOrder;
    } else if (sortBy === 'email') {
      orderBy.email = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [drivers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      drivers: drivers.map((driver) => this.mapToDriverResponse(driver)),
      total,
      page: pageNum,
      limit: limitNum,
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const driver = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'DRIVER',
        deletedAt: null,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return this.mapToDriverResponse(driver);
  }

  async updateLocation(
    id: string,
    updateLocationDto: UpdateLocationDto,
  ): Promise<UserResponseDto> {
    const { currentLat, currentLng } = updateLocationDto;

    // Check if driver exists
    const driver = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'DRIVER',
        deletedAt: null,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const updatedDriver = await this.prisma.user.update({
      where: { id },
      data: {
        currentLat,
        currentLng,
        lastActiveAt: new Date(),
      },
    });

    // Broadcast location update via WebSocket
    this.driversGateway.broadcastDriverLocation({
      driverId: updatedDriver.id,
      driverName: updatedDriver.name,
      currentLat: updatedDriver.currentLat!,
      currentLng: updatedDriver.currentLng!,
      lastActiveAt: updatedDriver.lastActiveAt!,
      vehicleType: updatedDriver.vehicleType || undefined,
      vehicleNumber: updatedDriver.vehicleNumber || undefined,
    });

    this.logger.log(`Driver ${id} location updated: ${currentLat}, ${currentLng}`);

    return this.mapToDriverResponse(updatedDriver);
  }

  async applyForDriver(
    userId: string,
    driverApplicationDto: DriverApplicationDto,
  ): Promise<DriverApplicationResponseDto> {
    const { licenseNumber, vehicleNumber, vehicleType, reason } =
      driverApplicationDto;

    try {
      // Check if user exists and is eligible to apply
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id: userId,
          role: 'CUSTOMER',
          deletedAt: null,
        },
      });

      if (!existingUser) {
        throw new NotFoundException('User not found');
      }

      // Check if user already has a pending or approved application
      if (existingUser.driverApplicationStatus === 'PENDING') {
        throw new BadRequestException(
          'You already have a pending driver application',
        );
      }

      if (existingUser.driverApplicationStatus === 'APPROVED') {
        throw new BadRequestException(
          'Your driver application has already been approved',
        );
      }

      // Allow reapplication if status is REJECTED or NOT_APPLIED
      if (existingUser.driverApplicationStatus === 'REJECTED') {
        this.logger.log(
          `User ${userId} is reapplying after previous rejection`,
        );
      }

      // Update user with driver application data
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          licenseNumber,
          vehicleNumber,
          vehicleType,
          driverApplicationReason: reason,
          driverApplicationStatus: 'PENDING',
          driverApplicationDate: new Date(),
          // Clear previous rejection reason when reapplying
          driverRejectionReason: null,
        },
      });

      this.logger.log(
        `Driver application submitted successfully for user: ${userId}`,
      );
      return this.mapToDriverApplicationResponse(updatedUser);
    } catch (error) {
      this.logger.error(`Driver application failed for user ${userId}:`, error);
      throw error;
    }
  }

  async approveDriverApplication(
    driverId: string,
    adminId: string,
  ): Promise<DriverApplicationResponseDto> {
    // Check if driver application exists
    const driver = await this.prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'CUSTOMER',
        driverApplicationStatus: 'PENDING',
        deletedAt: null,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver application not found');
    }

    // Approve the application
    const updatedDriver = await this.prisma.user.update({
      where: { id: driverId },
      data: {
        role: 'DRIVER',
        driverApplicationStatus: 'APPROVED',
        driverApprovalDate: new Date(),
        driverApprovedBy: adminId,
        isAvailable: true,
      },
    });

    return this.mapToDriverApplicationResponse(updatedDriver);
  }

  async rejectDriverApplication(
    driverId: string,
    adminId: string,
    reason: string,
  ): Promise<DriverApplicationResponseDto> {
    // Check if driver application exists
    const driver = await this.prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'CUSTOMER',
        driverApplicationStatus: 'PENDING',
        deletedAt: null,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver application not found');
    }

    // Reject the application
    const updatedDriver = await this.prisma.user.update({
      where: { id: driverId },
      data: {
        driverApplicationStatus: 'REJECTED',
        driverApprovalDate: new Date(),
        driverApprovedBy: adminId,
        driverRejectionReason: reason,
      },
    });

    return this.mapToDriverApplicationResponse(updatedDriver);
  }

  async getDriverPerformance(id: string): Promise<DriverPerformanceResponse> {
    const driver = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'DRIVER',
        deletedAt: null,
      },
      include: {
        assignedParcels: {
          where: {
            status: {
              in: ['delivered', 'cancelled'],
            },
          },
        },
        reviewsReceived: true,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const completedDeliveries = driver.assignedParcels.filter(
      (parcel) => parcel.status === 'delivered',
    ).length;
    const cancelledDeliveries = driver.assignedParcels.filter(
      (parcel) => parcel.status === 'cancelled',
    ).length;
    const totalDeliveries = driver.assignedParcels.length;

    const averageRating =
      driver.reviewsReceived.length > 0
        ? driver.reviewsReceived.reduce(
            (sum, review) => sum + review.rating,
            0,
          ) / driver.reviewsReceived.length
        : 0;

    return {
      driverId: driver.id,
      driverName: driver.name,
      totalDeliveries,
      completedDeliveries,
      cancelledDeliveries,
      averageRating,
      totalRatings: driver.reviewsReceived.length,
      totalEarnings: driver.totalEarnings || 0,
      onTimeDeliveryRate: driver.onTimeDeliveryRate || 0,
      averageDeliveryTime: driver.averageDeliveryTime || 0,
      lastActiveAt: driver.lastActiveAt,
    };
  }

  async assignParcel(
    assignParcelDto: AssignParcelDto,
  ): Promise<AssignParcelResponse> {
    const { driverId, parcelId, estimatedPickupTime, estimatedDeliveryTime } =
      assignParcelDto;

    // Check if driver exists and is approved
    const driver = await this.prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'DRIVER',
        driverApplicationStatus: 'APPROVED',
        isActive: true,
        deletedAt: null,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found or not available');
    }

    // Check if parcel exists and is not already assigned
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id: parcelId,
        status: 'pending',
        driverId: null,
        deletedAt: null,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found or already assigned');
    }

    // Assign parcel to driver - keep status as 'assigned' (pending driver to start journey)
    const updatedParcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        driverId,
        assignedAt: new Date(),
        status: 'assigned', // Status remains 'assigned' until driver starts journey
        estimatedPickupTime,
        estimatedDeliveryTime,
      },
    });

    // Create status history entry for assignment
    await this.prisma.parcelStatusHistory.create({
      data: {
        parcelId,
        status: 'assigned',
        location: 'Driver assigned - Pending pickup',
        updatedBy: driverId,
        notes: `Parcel assigned to driver ${driver.name}. Status: Pending driver to start journey.`,
      },
    });

    // Send driver assignment email to driver
    try {
      await this.mailerService.sendDriverAssignment({
        to: driver.email,
        name: driver.name,
        profilePicture: driver.profilePicture || undefined,
        parcelId: updatedParcel.id,
        trackingNumber: updatedParcel.trackingNumber,
        pickupAddress: updatedParcel.pickupAddress,
        deliveryAddress: updatedParcel.deliveryAddress,
        estimatedDelivery:
          updatedParcel.estimatedDeliveryTime?.toISOString() ||
          'To be determined',
      });
      this.logger.log(
        `Driver assignment email sent to driver: ${driver.email}`,
      );
    } catch (emailError) {
      this.logger.warn(
        `Failed to send driver assignment email to driver ${driver.email}:`,
        emailError,
      );
    }

    // Broadcast driver assignment update via WebSocket
    this.driversGateway.broadcastDriverAssignment({
      driverId: driver.id,
      parcelId: parcelId,
      driverName: driver.name,
      vehicleType: driver.vehicleType || undefined,
    });

    this.logger.log(`Parcel ${parcelId} assigned to driver ${driver.name}`);

    return {
      message:
        'Parcel assigned successfully. Driver will start journey when ready.',
      parcel: updatedParcel,
      driver: this.mapToDriverResponse(driver),
    };
  }

  async updateParcelStatus(
    parcelId: string,
    driverId: string,
    updateParcelStatusDto: UpdateParcelStatusDto,
  ): Promise<UpdateParcelStatusResponse> {
    const { status, currentLocation, latitude, longitude, notes } =
      updateParcelStatusDto;

    // Check if parcel exists and is assigned to this driver
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id: parcelId,
        driverId,
        deletedAt: null,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found or not assigned to you');
    }

    // Update parcel status
    const updatedParcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        status,
        currentLocation,
        latitude,
        longitude,
      },
    });

    // Create status history entry
    await this.prisma.parcelStatusHistory.create({
      data: {
        parcelId,
        status,
        location: currentLocation || 'Location not specified',
        updatedBy: driverId,
        notes: notes || `Status updated to ${status}`,
      },
    });

    // Broadcast parcel status update via WebSocket
    this.driversGateway.broadcastParcelStatusUpdate({
      parcelId,
      driverId,
      status,
      location: currentLocation,
      timestamp: new Date(),
    });

    this.logger.log(`Parcel ${parcelId} status updated to ${status} by driver ${driverId}`);

    return {
      message: `Parcel status updated to ${status}`,
      parcel: updatedParcel,
    };
  }

  private mapToDriverResponse(
    driver: Prisma.UserGetPayload<Record<string, never>>,
  ): UserResponseDto {
    return {
      id: driver.id,
      email: driver.email,
      name: driver.name,
      phone: driver.phone ?? undefined,
      address: driver.address ?? undefined,
      profilePicture: driver.profilePicture ?? undefined,
      role: driver.role,
      isActive: driver.isActive,
      licenseNumber: driver.licenseNumber ?? undefined,
      vehicleNumber: driver.vehicleNumber ?? undefined,
      vehicleType: driver.vehicleType ?? undefined,
      currentLat: driver.currentLat ?? undefined,
      currentLng: driver.currentLng ?? undefined,
      averageRating: driver.averageRating ?? undefined,
      totalRatings: driver.totalRatings,
      totalDeliveries: driver.totalDeliveries,
      completedDeliveries: driver.completedDeliveries,
      cancelledDeliveries: driver.cancelledDeliveries,
      averageDeliveryTime: driver.averageDeliveryTime ?? undefined,
      onTimeDeliveryRate: driver.onTimeDeliveryRate ?? undefined,
      lastActiveAt: driver.lastActiveAt ?? undefined,
      totalEarnings: driver.totalEarnings ?? undefined,
      totalParcelsEverSent: driver.totalParcelsEverSent,
      totalParcelsReceived: driver.totalParcelsReceived,
      preferredPaymentMethod: driver.preferredPaymentMethod ?? undefined,
      driverApplicationStatus: driver.driverApplicationStatus ?? undefined,
      driverApplicationDate: driver.driverApplicationDate ?? undefined,
      driverApplicationReason: driver.driverApplicationReason ?? undefined,
      driverApprovalDate: driver.driverApprovalDate ?? undefined,
      driverRejectionReason: driver.driverRejectionReason ?? undefined,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };
  }

  private mapToDriverApplicationResponse(
    user: Record<string, any>,
  ): DriverApplicationResponseDto {
    return {
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      driverApplicationStatus: user.driverApplicationStatus as
        | 'PENDING'
        | 'APPROVED'
        | 'REJECTED',
      driverApplicationDate: user.driverApplicationDate as Date,
      driverApplicationReason: user.driverApplicationReason as string,
      driverApprovalDate: user.driverApprovalDate as Date,
      driverRejectionReason: user.driverRejectionReason as string,
      licenseNumber: user.licenseNumber as string,
      vehicleNumber: user.vehicleNumber as string,
      vehicleType: user.vehicleType as
        | 'MOTORCYCLE'
        | 'CAR'
        | 'VAN'
        | 'TRUCK'
        | undefined,
    };
  }
}
