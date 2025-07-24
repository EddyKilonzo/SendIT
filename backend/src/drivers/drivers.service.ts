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
  UpdateAvailabilityDto,
  DriverApplicationDto,
  DriverApplicationResponseDto,
  UserResponseDto,
  AssignParcelDto,
  UpdateParcelStatusDto,
} from '../users/dto';

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

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    isAvailable?: boolean;
    vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
    driverApplicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
      isAvailable,
      vehicleType,
      driverApplicationStatus,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      minimumRating,
    } = query;

    const skip = (page - 1) * limit;

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

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
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

    // Get drivers with pagination
    const [drivers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder } as Prisma.UserOrderByWithRelationInput,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      drivers: drivers.map((driver) => this.mapToDriverResponse(driver)),
      total,
      page,
      limit,
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
    const { currentLat, currentLng, address } = updateLocationDto;

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
        address,
        lastActiveAt: new Date(),
      },
    });

    return this.mapToDriverResponse(updatedDriver);
  }

  async updateAvailability(
    id: string,
    updateAvailabilityDto: UpdateAvailabilityDto,
  ): Promise<UserResponseDto> {
    const { isAvailable } = updateAvailabilityDto;

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
        isAvailable,
        lastActiveAt: new Date(),
      },
    });

    return this.mapToDriverResponse(updatedDriver);
  }

  async applyForDriver(
    userId: string,
    driverApplicationDto: DriverApplicationDto,
  ): Promise<DriverApplicationResponseDto> {
    try {
      this.logger.log(`Processing driver application for user: ${userId}`);

      const { licenseNumber, vehicleNumber, vehicleType } =
        driverApplicationDto;

      // Check if user exists and is not already a driver
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          role: { not: 'DRIVER' }, // Allow any role except DRIVER
          deletedAt: null,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found or already a driver');
      }

      this.logger.log(`User found: ${user.email}, current role: ${user.role}`);

      // Check if license number is already taken (only if license number is provided)
      if (licenseNumber) {
        const existingDriver = await this.prisma.user.findFirst({
          where: {
            licenseNumber,
            id: { not: userId }, // Exclude current user
          },
        });

        if (existingDriver) {
          throw new BadRequestException('License number already registered');
        }
      }

      this.logger.log(`License number check passed, updating user...`);

      // Update user with driver application
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          licenseNumber,
          vehicleNumber,
          vehicleType,
          driverApplicationStatus: 'PENDING',
          driverApplicationDate: new Date(),
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

    // Check if driver exists and is available
    const driver = await this.prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'DRIVER',
        isAvailable: true,
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

    // Assign parcel to driver
    const updatedParcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        driverId,
        assignedAt: new Date(),
        status: 'assigned',
        estimatedPickupTime,
        estimatedDeliveryTime,
      },
    });

    return {
      message: 'Parcel assigned successfully',
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
        location: currentLocation,
        latitude,
        longitude,
        updatedBy: driverId,
        notes,
      },
    });

    return {
      message: 'Parcel status updated successfully',
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
      role: driver.role,
      isActive: driver.isActive,
      licenseNumber: driver.licenseNumber ?? undefined,
      vehicleNumber: driver.vehicleNumber ?? undefined,
      vehicleType: driver.vehicleType ?? undefined,
      isAvailable: driver.isAvailable,
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
