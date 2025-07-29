import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, Parcel, User } from '@prisma/client';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UsersQueryDto,
  UserResponseDto,
  ProfilePictureResponseDto,
} from './dto';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, name, phone, address } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (only customer role allowed in this service)
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        address,
        role: 'CUSTOMER', // Force customer role
      },
    });

    return this.mapToUserResponse(user);
  }

  async findAll(query: UsersQueryDto): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.UserWhereInput = {
      role: 'CUSTOMER', // Only customers
      deletedAt: null,
    };

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

    // Get users with pagination
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
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

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        role: 'CUSTOMER', // Only customers
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        role: 'CUSTOMER', // Only customers
        deletedAt: null,
      },
    });

    return user ? this.mapToUserResponse(user) : null;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    // Validate ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new BadRequestException('Invalid user ID provided');
    }

    const { name, phone, address, email } = updateUserDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: id.trim(),
        deletedAt: null,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Build update data object with only provided fields
    const updateData: any = {};

    if (name !== undefined) {
      updateData.name = name;
    }
    if (phone !== undefined) {
      updateData.phone = phone;
    }
    if (address !== undefined) {
      updateData.address = address;
    }
    if (email !== undefined) {
      // Check if email is being changed and if it's already taken
      if (email !== existingUser.email) {
        const emailExists = await this.prisma.user.findUnique({
          where: { email },
        });

        if (emailExists) {
          throw new BadRequestException('Email already taken');
        }
      }
      updateData.email = email;
    }

    // If no fields to update, return current user
    if (Object.keys(updateData).length === 0) {
      return this.mapToUserResponse(existingUser);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.mapToUserResponse(updatedUser);
  }

  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedNewPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async remove(id: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: 'User deleted successfully' };
  }

  async deactivateAccount(userId: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Account is already deactivated');
    }

    // Deactivate account
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    return { message: 'Account deactivated successfully' };
  }

  async deleteAccount(userId: string): Promise<{ message: string }> {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete the account
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    return { message: 'Account deleted successfully' };
  }

  async getProfile(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
        // Allow suspended users to access their profile
        // deletedAt: null, // Removed this filter to allow suspended users
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  async getDashboard(userId: string): Promise<any> {
    console.log(`🔍 Dashboard Request - User ID: ${userId}`);
    
    // Get user with parcels
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        // Allow suspended users to access their dashboard
        // deletedAt: null, // Removed this filter to allow suspended users
      },
      include: {
        sentParcels: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        receivedParcels: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    console.log(`✅ User found: ${user.name} (${user.email})`);

    // Get all user parcels for statistics - check by ID, name, and email
    const allParcels = await this.prisma.parcel.findMany({
      where: {
        OR: [
          { senderId: userId },
          { recipientId: userId },
          { senderName: user.name },
          { recipientName: user.name },
          { senderEmail: user.email },
          { recipientEmail: user.email }
        ],
        deletedAt: null,
      },
    });

    console.log(`📦 Total parcels found: ${allParcels.length}`);

    // Calculate statistics using allParcels instead of limited user.sentParcels
    const totalParcelsSent = allParcels.filter(
      (parcel) => parcel.senderId === userId || parcel.senderName === user.name || parcel.senderEmail === user.email,
    ).length;
    const totalParcelsReceived = allParcels.filter(
      (parcel) => parcel.recipientId === userId || parcel.recipientName === user.name || parcel.recipientEmail === user.email,
    ).length;

    console.log(`📤 Sent parcels: ${totalParcelsSent}`);
    console.log(`📥 Received parcels: ${totalParcelsReceived}`);

    const parcelsInTransit = allParcels.filter((parcel) =>
      ['assigned', 'picked_up', 'in_transit'].includes(parcel.status),
    ).length;

    console.log(`🚚 Parcels in transit: ${parcelsInTransit}`);

    // Calculate scheduled for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const scheduledForTomorrow = allParcels.filter((parcel) => {
      if (!parcel.estimatedPickupTime) return false;
      const pickupDate = new Date(parcel.estimatedPickupTime);
      return pickupDate >= tomorrow && pickupDate < dayAfterTomorrow;
    }).length;

    console.log(`📅 Scheduled for tomorrow: ${scheduledForTomorrow}`);

    // Calculate total spent - only for parcels where user is the sender (not recipient)
    const sentParcels = allParcels.filter(
      (parcel) => parcel.senderId === userId || parcel.senderName === user.name || parcel.senderEmail === user.email,
    );
    
    const totalSpent = sentParcels
      .filter((parcel) => parcel.deliveryFee)
      .reduce((sum, parcel) => sum + (parcel.deliveryFee || 0), 0);

    console.log(`💰 Total spent: ksh${totalSpent.toFixed(0)}`);

    // Get recent parcels for activity feed
    const recentParcels = allParcels
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .slice(0, 5);

    console.log(`🕒 Recent parcels: ${recentParcels.length}`);

    // Create summary cards
    const summaryCards = [
      {
        title: 'Parcels Sent',
        value: totalParcelsSent,
        icon: 'fas fa-paper-plane',
      },
      {
        title: 'Parcels Received',
        value: totalParcelsReceived,
        icon: 'fas fa-inbox',
      },
      {
        title: 'Total Spent',
        value: `ksh${totalSpent.toFixed(0)}`,
        icon: 'fas fa-dollar-sign',
      },
    ];

    const result = {
      totalParcelsSent,
      totalParcelsReceived,
      parcelsInTransit,
      scheduledForTomorrow,
      totalSpent,
      recentParcels: recentParcels.map((parcel) =>
        this.mapToParcelResponse(parcel),
      ),
      summaryCards,
      totalParcels: allParcels.length,
    };

    console.log(`✅ Dashboard response:`, {
      totalParcelsSent: result.totalParcelsSent,
      totalParcelsReceived: result.totalParcelsReceived,
      parcelsInTransit: result.parcelsInTransit,
      scheduledForTomorrow: result.scheduledForTomorrow,
      totalParcels: result.totalParcels,
      recentParcelsCount: result.recentParcels.length
    });

    return result;
  }

  async uploadProfilePicture(
    userId: string,
    file: Express.Multer.File,
  ): Promise<ProfilePictureResponseDto> {
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Extract public ID from current profile picture URL if it exists
      let currentPublicId: string | undefined;
      if (user.profilePicture) {
        const urlParts = user.profilePicture.split('/');
        const filename = urlParts[urlParts.length - 1];
        currentPublicId = filename.split('.')[0]; // Remove file extension
      }

      // Upload new profile picture
      const uploadResult = await this.cloudinaryService.updateProfilePicture(
        file,
        currentPublicId,
      );

      // Update user with new profile picture URL
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { profilePicture: uploadResult.url },
      });

      this.logger.log(`Profile picture updated for user: ${userId}`);

      return {
        id: updatedUser.id,
        profilePicture: updatedUser.profilePicture!,
        message: 'Profile picture updated successfully',
      };
    } catch (error) {
      this.logger.error('Profile picture upload failed:', error);
      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  private mapToUserResponse(
    user: Prisma.UserGetPayload<object>,
  ): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      address: user.address || undefined,
      profilePicture: user.profilePicture || undefined,
      role: user.role,
      isActive: user.isActive,
      // Driver-specific fields
      licenseNumber: user.licenseNumber || undefined,
      vehicleNumber: user.vehicleNumber || undefined,
      vehicleType: user.vehicleType || undefined,
      currentLat: user.currentLat || undefined,
      currentLng: user.currentLng || undefined,
      // Driver application fields
      driverApplicationStatus: user.driverApplicationStatus || undefined,
      driverApplicationDate: user.driverApplicationDate || undefined,
      driverApprovalDate: user.driverApprovalDate || undefined,
      driverRejectionReason: user.driverRejectionReason || undefined,
      // Performance metrics
      averageRating: user.averageRating || undefined,
      totalRatings: user.totalRatings,
      totalDeliveries: user.totalDeliveries,
      completedDeliveries: user.completedDeliveries,
      cancelledDeliveries: user.cancelledDeliveries,
      averageDeliveryTime: user.averageDeliveryTime || undefined,
      onTimeDeliveryRate: user.onTimeDeliveryRate || undefined,
      lastActiveAt: user.lastActiveAt || undefined,
      totalEarnings: user.totalEarnings || undefined,
      // Customer metrics
      totalParcelsEverSent: user.totalParcelsEverSent,
      totalParcelsReceived: user.totalParcelsReceived,
      preferredPaymentMethod: user.preferredPaymentMethod || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToParcelResponse(parcel: Prisma.ParcelGetPayload<object>): any {
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
      status: parcel.status,
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
      deliveryFee: parcel.deliveryFee || undefined,
      paymentStatus: parcel.paymentStatus,
      deliveredToRecipient: parcel.deliveredToRecipient,
      deliveryConfirmedAt: parcel.deliveryConfirmedAt || undefined,
      deliveryConfirmedBy: parcel.deliveryConfirmedBy || undefined,
      customerSignature: parcel.customerSignature || undefined,
      customerNotes: parcel.customerNotes || undefined,
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt,
    };
  }
}
