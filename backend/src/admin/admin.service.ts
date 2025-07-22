import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
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
} from './dto';
import { UserResponseDto } from '../users/dto';
import { ParcelResponseDto } from '../parcels/dto';

interface ParcelWithRelations {
  id: string;
  trackingNumber: string;
  senderId?: string | null;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientId?: string | null;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  driverId?: string | null;
  assignedAt?: Date | null;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation?: string | null;
  status: string;
  weight: number;
  description?: string | null;
  value?: number | null;
  deliveryInstructions?: string | null;
  notes?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimatedPickupTime?: Date | null;
  actualPickupTime?: Date | null;
  estimatedDeliveryTime?: Date | null;
  actualDeliveryTime?: Date | null;
  totalDeliveryTime?: number | null;
  deliveryAttempts: number;
  priority: string;
  deliveryFee?: number | null;
  paymentStatus: string;
  deliveredToRecipient: boolean;
  deliveryConfirmedAt?: Date | null;
  deliveryConfirmedBy?: string | null;
  customerSignature?: string | null;
  customerNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  sender?: Prisma.UserGetPayload<object> | null;
  recipient?: Prisma.UserGetPayload<object> | null;
  driver?: Prisma.UserGetPayload<object> | null;
  statusHistory?: object[] | null;
  reviews?: object[] | null;
  deliveryProof?: object | null;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // Dashboard and Statistics
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const [
      totalUsers,
      totalDrivers,
      totalParcels,
      pendingParcels,
      inTransitParcels,
      deliveredParcels,
      cancelledParcels,
      availableDrivers,
      activeDrivers,
      pendingDriverApplications,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: 'CUSTOMER', deletedAt: null },
      }),
      this.prisma.user.count({
        where: { role: 'DRIVER', deletedAt: null },
      }),
      this.prisma.parcel.count({
        where: { deletedAt: null },
      }),
      this.prisma.parcel.count({
        where: { status: 'pending', deletedAt: null },
      }),
      this.prisma.parcel.count({
        where: { status: 'in_transit', deletedAt: null },
      }),
      this.prisma.parcel.count({
        where: { status: 'delivered', deletedAt: null },
      }),
      this.prisma.parcel.count({
        where: { status: 'cancelled', deletedAt: null },
      }),
      this.prisma.user.count({
        where: {
          role: 'DRIVER',
          isAvailable: true,
          isActive: true,
          deletedAt: null,
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'DRIVER',
          isActive: true,
          deletedAt: null,
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
      this.prisma.user.count({
        where: {
          driverApplicationStatus: 'PENDING',
          deletedAt: null,
        },
      }),
    ]);

    return {
      totalUsers,
      totalDrivers,
      totalParcels,
      pendingParcels,
      inTransitParcels,
      deliveredParcels,
      cancelledParcels,
      availableDrivers,
      activeDrivers,
      pendingDriverApplications,
    };
  }

  async getSystemStats(): Promise<SystemStatsDto> {
    // Get revenue data (assuming deliveryFee is the revenue)
    const revenueData = await this.prisma.parcel.aggregate({
      where: {
        status: 'delivered',
        deletedAt: null,
        deliveryFee: { not: null },
      },
      _sum: { deliveryFee: true },
    });

    const monthlyRevenueData = await this.prisma.parcel.aggregate({
      where: {
        status: 'delivered',
        deletedAt: null,
        deliveryFee: { not: null },
        actualDeliveryTime: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { deliveryFee: true },
    });

    // Get average delivery time
    const deliveryTimeData = await this.prisma.parcel.aggregate({
      where: {
        status: 'delivered',
        deletedAt: null,
        totalDeliveryTime: { not: null },
      },
      _avg: { totalDeliveryTime: true },
    });

    // Get customer satisfaction (average rating)
    const satisfactionData = await this.prisma.review.aggregate({
      _avg: { rating: true },
    });

    // Get top performing drivers
    const topDrivers = await this.prisma.user.findMany({
      where: {
        role: 'DRIVER',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        completedDeliveries: true,
        averageRating: true,
      },
      orderBy: [{ completedDeliveries: 'desc' }, { averageRating: 'desc' }],
      take: 5,
    });

    // Get popular routes
    const popularRoutes = await this.prisma.parcel.groupBy({
      by: ['pickupAddress', 'deliveryAddress'],
      where: {
        deletedAt: null,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    return {
      totalRevenue: revenueData._sum.deliveryFee || 0,
      monthlyRevenue: monthlyRevenueData._sum.deliveryFee || 0,
      averageDeliveryTime: deliveryTimeData._avg.totalDeliveryTime || 0,
      customerSatisfaction: satisfactionData._avg.rating || 0,
      topPerformingDrivers: topDrivers.map((driver) => ({
        driverId: driver.id,
        driverName: driver.name,
        deliveriesCompleted: driver.completedDeliveries,
        averageRating: driver.averageRating || 0,
      })),
      popularRoutes: popularRoutes.map((route) => ({
        fromLocation: route.pickupAddress,
        toLocation: route.deliveryAddress,
        parcelCount: route._count.id,
      })),
    };
  }

  // User Management
  async findAllUsers(query: UserFilterDto): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isActive,
      hasParcels,
      driverApplicationStatus,
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (driverApplicationStatus) {
      where.driverApplicationStatus = driverApplicationStatus;
    }

    if (hasParcels) {
      where.OR = [
        { sentParcels: { some: { deletedAt: null } } },
        { receivedParcels: { some: { deletedAt: null } } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              sentParcels: true,
              receivedParcels: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => this.mapToUserResponse(user)),
      total,
      page,
      limit,
    };
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        sentParcels: {
          where: { deletedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        receivedParcels: {
          where: { deletedAt: null },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        reviewsGiven: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        reviewsReceived: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  async manageUser(
    userId: string,
    managementDto: UserManagementDto,
  ): Promise<UserResponseDto> {
    const { action } = managementDto;

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let updateData: Prisma.UserUpdateInput = {};

    switch (action) {
      case 'activate':
        updateData = { isActive: true };
        break;
      case 'deactivate':
        updateData = { isActive: false };
        break;
      case 'suspend':
        updateData = {
          isActive: false,
          deletedAt: new Date(),
        };
        break;
      case 'unsuspend':
        updateData = {
          isActive: true,
          deletedAt: null,
        };
        break;
      default:
        throw new BadRequestException('Invalid action');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.mapToUserResponse(updatedUser);
  }

  // Driver Management
  async findAllDrivers(query: DriverFilterDto): Promise<{
    drivers: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      isAvailable,
      vehicleType,
      hasAssignedParcels,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: 'DRIVER',
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
        { vehicleNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable;
    }

    if (vehicleType) {
      where.vehicleType = vehicleType;
    }

    if (hasAssignedParcels) {
      where.assignedParcels = {
        some: {
          status: { in: ['assigned', 'picked_up', 'in_transit'] },
          deletedAt: null,
        },
      };
    }

    const [drivers, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              assignedParcels: true,
              reviewsReceived: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      drivers: drivers.map((driver) => this.mapToUserResponse(driver)),
      total,
      page,
      limit,
    };
  }

  async manageDriver(
    driverId: string,
    managementDto: DriverManagementDto,
  ): Promise<UserResponseDto> {
    const { action } = managementDto;

    const driver = await this.prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'DRIVER',
        deletedAt: null,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    let updateData: Prisma.UserUpdateInput = {};

    switch (action) {
      case 'activate':
        updateData = { isActive: true };
        break;
      case 'deactivate':
        updateData = { isActive: false };
        break;
      case 'suspend':
        updateData = {
          isActive: false,
          isAvailable: false,
        };
        break;
      case 'unsuspend':
        updateData = {
          isActive: true,
          isAvailable: true,
        };
        break;
      default:
        throw new BadRequestException('Invalid action');
    }

    const updatedDriver = await this.prisma.user.update({
      where: { id: driverId },
      data: updateData,
    });

    return this.mapToUserResponse(updatedDriver);
  }

  // Driver Application Management
  async getDriverApplications(query: DriverApplicationFilterDto): Promise<{
    applications: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, search, status, dateFrom, dateTo } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      driverApplicationStatus: { not: null },
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { licenseNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.driverApplicationStatus = status;
    }

    if (dateFrom || dateTo) {
      where.driverApplicationDate = {};
      if (dateFrom) {
        where.driverApplicationDate.gte = new Date(dateFrom);
      }
      if (dateTo) {
        where.driverApplicationDate.lte = new Date(dateTo);
      }
    }

    const [applications, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { driverApplicationDate: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      applications: applications.map((app) => this.mapToUserResponse(app)),
      total,
      page,
      limit,
    };
  }

  async manageDriverApplication(
    userId: string,
    managementDto: DriverApplicationManagementDto,
    adminId: string,
  ): Promise<UserResponseDto> {
    const { action, reason } = managementDto;

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        driverApplicationStatus: 'PENDING',
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('Driver application not found');
    }

    let updateData: Prisma.UserUpdateInput = {
      driverApprovalDate: new Date(),
      driverApprovedBy: adminId,
    };

    switch (action) {
      case 'approve':
        updateData = {
          ...updateData,
          role: 'DRIVER',
          driverApplicationStatus: 'APPROVED',
          isAvailable: true,
          isActive: true,
        };
        break;
      case 'reject':
        updateData = {
          ...updateData,
          driverApplicationStatus: 'REJECTED',
          driverRejectionReason: reason,
        };
        break;
      default:
        throw new BadRequestException('Invalid action');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.mapToUserResponse(updatedUser);
  }

  // Parcel Management
  async findAllParcels(query: ParcelFilterDto): Promise<{
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
      assignedDriverId,
      dateFrom,
      dateTo,
      priority,
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.ParcelWhereInput = {
      deletedAt: null,
    };

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

    if (assignedDriverId) {
      where.driverId = assignedDriverId;
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

    if (priority) {
      where.priority = priority.toUpperCase() as
        | 'LOW'
        | 'STANDARD'
        | 'HIGH'
        | 'URGENT';
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
          reviews: true,
          deliveryProof: true,
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

  async findParcelById(id: string): Promise<ParcelResponseDto> {
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id,
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

  async manageParcel(
    parcelId: string,
    managementDto: ParcelManagementDto,
  ): Promise<ParcelResponseDto> {
    const { action, newDriverId } = managementDto;

    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id: parcelId,
        deletedAt: null,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found');
    }

    let updateData: Prisma.ParcelUpdateInput = {};

    switch (action) {
      case 'cancel':
        updateData = { status: 'cancelled' };
        break;
      case 'reassign': {
        if (!newDriverId) {
          throw new BadRequestException(
            'New driver ID is required for reassignment',
          );
        }
        // Verify new driver exists and is available
        const newDriver = await this.prisma.user.findFirst({
          where: {
            id: newDriverId,
            role: 'DRIVER',
            isAvailable: true,
            isActive: true,
            deletedAt: null,
          },
        });
        if (!newDriver) {
          throw new BadRequestException(
            'New driver not found or not available',
          );
        }
        updateData = {
          driver: { connect: { id: newDriverId } },
          assignedAt: new Date(),
          status: 'assigned',
        };
        break;
      }
      case 'priority':
        updateData = { priority: 'HIGH' };
        break;
      case 'normal':
        updateData = { priority: 'STANDARD' };
        break;
      default:
        throw new BadRequestException('Invalid action');
    }

    const updatedParcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: updateData,
      include: {
        sender: true,
        recipient: true,
        driver: true,
        statusHistory: true,
        reviews: true,
        deliveryProof: true,
      },
    });

    return this.mapToParcelResponse(updatedParcel as ParcelWithRelations);
  }

  // Parcel Assignment
  async assignParcelToDriver(
    assignmentDto: AssignParcelToDriverDto,
  ): Promise<ParcelResponseDto> {
    const { parcelId, driverId, assignmentNotes } = assignmentDto;

    // Verify parcel exists and is available for assignment
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id: parcelId,
        status: 'pending',
        driverId: null,
        deletedAt: null,
      },
    });

    if (!parcel) {
      throw new NotFoundException(
        'Parcel not found or not available for assignment',
      );
    }

    // Verify driver exists and is available
    const driver = await this.prisma.user.findFirst({
      where: {
        id: driverId,
        role: 'DRIVER',
        isAvailable: true,
        isActive: true,
        deletedAt: null,
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found or not available');
    }

    // Assign parcel to driver
    const updatedParcel = await this.prisma.parcel.update({
      where: { id: parcelId },
      data: {
        driverId,
        assignedAt: new Date(),
        status: 'assigned',
        notes: assignmentNotes,
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
      },
    });

    return this.mapToParcelResponse(updatedParcel);
  }

  async bulkAssignParcels(bulkAssignmentDto: BulkAssignParcelsDto): Promise<{
    success: number;
    failed: number;
    results: Array<{ parcelId: string; success: boolean; message: string }>;
  }> {
    const { assignments } = bulkAssignmentDto;
    const results: Array<{
      parcelId: string;
      success: boolean;
      message: string;
    }> = [];
    let success = 0;
    let failed = 0;

    for (const assignment of assignments) {
      try {
        await this.assignParcelToDriver(assignment);
        results.push({
          parcelId: assignment.parcelId,
          success: true,
          message: 'Parcel assigned successfully',
        });
        success++;
      } catch (error) {
        results.push({
          parcelId: assignment.parcelId,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    return { success, failed, results };
  }

  // Helper methods
  private mapToUserResponse(
    user: Prisma.UserGetPayload<{
      include?: {
        sentParcels?: boolean;
        receivedParcels?: boolean;
        reviewsGiven?: boolean;
        reviewsReceived?: boolean;
        _count?: {
          select: {
            sentParcels?: boolean;
            receivedParcels?: boolean;
            assignedParcels?: boolean;
            reviewsReceived?: boolean;
          };
        };
      };
    }>,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      address: user.address || undefined,
      role: user.role,
      isActive: user.isActive,
      licenseNumber: user.licenseNumber || undefined,
      vehicleNumber: user.vehicleNumber || undefined,
      vehicleType: user.vehicleType || undefined,
      isAvailable: user.isAvailable,
      currentLat: user.currentLat || undefined,
      currentLng: user.currentLng || undefined,
      averageRating: user.averageRating || undefined,
      totalRatings: user.totalRatings,
      totalDeliveries: user.totalDeliveries,
      completedDeliveries: user.completedDeliveries,
      cancelledDeliveries: user.cancelledDeliveries,
      averageDeliveryTime: user.averageDeliveryTime || undefined,
      onTimeDeliveryRate: user.onTimeDeliveryRate || undefined,
      lastActiveAt: user.lastActiveAt || undefined,
      totalEarnings: user.totalEarnings || undefined,
      totalParcelsEverSent: user.totalParcelsEverSent,
      totalParcelsReceived: user.totalParcelsReceived,
      preferredPaymentMethod: user.preferredPaymentMethod || undefined,
      driverApplicationStatus: user.driverApplicationStatus || undefined,
      driverApplicationDate: user.driverApplicationDate || undefined,
      driverApprovalDate: user.driverApprovalDate || undefined,
      driverRejectionReason: user.driverRejectionReason || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToParcelResponse(parcel: ParcelWithRelations): ParcelResponseDto {
    return {
      id: parcel.id,
      trackingNumber: parcel.trackingNumber,
      senderId: parcel.senderId || undefined,
      senderName: parcel.senderName,
      senderEmail: parcel.senderEmail,
      senderPhone: parcel.senderPhone,
      recipientId: parcel.recipientId || undefined,
      recipientName: parcel.recipientName,
      recipientEmail: parcel.recipientEmail,
      recipientPhone: parcel.recipientPhone,
      driverId: parcel.driverId || undefined,
      assignedAt: parcel.assignedAt || undefined,
      pickupAddress: parcel.pickupAddress,
      deliveryAddress: parcel.deliveryAddress,
      currentLocation: parcel.currentLocation || undefined,
      status: parcel.status as
        | 'pending'
        | 'assigned'
        | 'picked_up'
        | 'in_transit'
        | 'delivered_to_recipient'
        | 'delivered'
        | 'cancelled',
      weight: parcel.weight,
      description: parcel.description || undefined,
      value: parcel.value || undefined,
      deliveryInstructions: parcel.deliveryInstructions || undefined,
      notes: parcel.notes || undefined,
      latitude: parcel.latitude || undefined,
      longitude: parcel.longitude || undefined,
      estimatedPickupTime: parcel.estimatedPickupTime || undefined,
      actualPickupTime: parcel.actualPickupTime || undefined,
      estimatedDeliveryTime: parcel.estimatedDeliveryTime || undefined,
      actualDeliveryTime: parcel.actualDeliveryTime || undefined,
      totalDeliveryTime: parcel.totalDeliveryTime || undefined,
      deliveryAttempts: parcel.deliveryAttempts,
      priority: parcel.priority as 'LOW' | 'STANDARD' | 'HIGH' | 'URGENT',
      deliveryFee: parcel.deliveryFee || undefined,
      paymentStatus: parcel.paymentStatus as
        | 'PENDING'
        | 'PAID'
        | 'FAILED'
        | 'REFUNDED',
      deliveredToRecipient: parcel.deliveredToRecipient,
      deliveryConfirmedAt: parcel.deliveryConfirmedAt || undefined,
      deliveryConfirmedBy: parcel.deliveryConfirmedBy || undefined,
      customerSignature: parcel.customerSignature || undefined,
      customerNotes: parcel.customerNotes || undefined,
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
      sender: parcel.sender ? this.mapToUserResponse(parcel.sender) : undefined,
      recipient: parcel.recipient
        ? this.mapToUserResponse(parcel.recipient)
        : undefined,
      driver: parcel.driver ? this.mapToUserResponse(parcel.driver) : undefined,
      statusHistory: parcel.statusHistory || [],
      reviews: parcel.reviews || [],
      deliveryProof: parcel.deliveryProof || undefined,
    };
  }
}
