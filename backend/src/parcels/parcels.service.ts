import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, Parcel, User } from '@prisma/client';
import {
  CreateParcelDto,
  UpdateParcelDto,
  ParcelQueryDto,
  ParcelResponseDto,
  ParcelStatusUpdateDto,
  DeliveryConfirmationDto,
  MarkAsCompletedDto,
} from './dto';
import { UserResponseDto } from '../users/dto';
import { MailerService } from '../mailer/mailer.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DELIVERY_FEE_CONFIG } from '../common/constants';

@Injectable()
export class ParcelsService {
  private readonly logger = new Logger(ParcelsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
    } = createParcelDto;

    // Generate unique tracking number
    const trackingNumber = await this.generateTrackingNumber();

    // Calculate delivery fee based on weight and distance
    const deliveryFee = this.calculateDeliveryFee(weight, pickupAddress, deliveryAddress);

    // Check if recipient is a registered user
    let recipientId: string | undefined = undefined;
    try {
      const recipientUser = await this.prisma.user.findUnique({
        where: { email: recipientEmail },
        select: { id: true }
      });
      if (recipientUser) {
        recipientId = recipientUser.id;
        this.logger.log(`Recipient ${recipientEmail} is a registered user with ID: ${recipientId}`);
      } else {
        this.logger.log(`Recipient ${recipientEmail} is not a registered user`);
      }
    } catch (error) {
      this.logger.warn(`Failed to check if recipient is registered: ${error}`);
    }

    // Create parcel
    const parcel = await this.prisma.parcel.create({
      data: {
        trackingNumber,
        senderId: userId,
        recipientId: recipientId, // Set recipientId if recipient is registered
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
        deliveryFee,
        status: 'pending',
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
      },
    });

    // Send parcel creation email to sender
    try {
      this.logger.log(`Debug - Sender data for parcel creation: name="${senderName}", profilePicture="${parcel.sender?.profilePicture}"`);
      this.logger.log(`Debug - Sender user object:`, JSON.stringify(parcel.sender, null, 2));
      await this.mailerService.sendParcelCreatedEmail({
        to: senderEmail,
        name: senderName,
        profilePicture: parcel.sender?.profilePicture || undefined,
        parcelId: parcel.id,
        trackingNumber,
        pickupAddress,
        deliveryAddress,
        estimatedDelivery: parcel.estimatedDeliveryTime?.toISOString() || 'To be determined',
      });
      this.logger.log(`Parcel creation email sent to sender: ${senderEmail}`);
    } catch (emailError) {
      this.logger.warn(
        `Failed to send parcel creation email to sender ${senderEmail}:`,
        emailError,
      );
      // Don't fail parcel creation if email fails
    }

    // Send parcel creation email to recipient
    try {
      this.logger.log(`Debug - Recipient data for parcel creation: name="${recipientName}", profilePicture="${parcel.recipient?.profilePicture}"`);
      this.logger.log(`Debug - Recipient user object:`, JSON.stringify(parcel.recipient, null, 2));
      await this.mailerService.sendParcelCreatedEmail({
        to: recipientEmail,
        name: recipientName,
        profilePicture: parcel.recipient?.profilePicture || undefined,
        parcelId: parcel.id,
        trackingNumber,
        pickupAddress,
        deliveryAddress,
        estimatedDelivery: parcel.estimatedDeliveryTime?.toISOString() || 'To be determined',
      });
      this.logger.log(
        `Parcel creation email sent to recipient: ${recipientEmail}`,
      );
    } catch (emailError) {
      this.logger.warn(
        `Failed to send parcel creation email to recipient ${recipientEmail}:`,
        emailError,
      );
      // Don't fail parcel creation if email fails
    }

    // Create notifications for both sender and recipient
    try {
      // Notification for sender (if registered)
      if (userId) {
        await this.notificationsService.create({
          userId: userId,
          title: 'Parcel Created',
          message: `Your parcel with tracking number ${trackingNumber} has been created successfully.`,
          type: 'PARCEL_CREATED',
          actionUrl: `/parcel/${parcel.id}`,
          parcelId: parcel.id,
        });
      }

      // Notification for recipient (if registered)
      if (parcel.recipientId) {
        await this.notificationsService.create({
          userId: parcel.recipientId,
          title: 'Parcel Created',
          message: `A parcel with tracking number ${trackingNumber} has been created for you.`,
          type: 'PARCEL_CREATED',
          actionUrl: `/parcel/${parcel.id}`,
          parcelId: parcel.id,
        });
      }
    } catch (notificationError) {
      this.logger.warn(
        'Failed to create parcel creation notifications:',
        notificationError,
      );
    }

    // Update user statistics for sender and recipient
    try {
      // Update sender statistics
      if (userId) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            totalParcelsEverSent: {
              increment: 1,
            },
          },
        });
      }

      // Update recipient statistics
      if (parcel.recipientId) {
        await this.prisma.user.update({
          where: { id: parcel.recipientId },
          data: {
            totalParcelsReceived: {
              increment: 1,
            },
          },
        });
      }
    } catch (statsError) {
      this.logger.warn(
        'Failed to update user statistics:',
        statsError,
      );
    }

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
      dateFrom,
      dateTo,
      assignedToMe,
    } = query;

    // Convert string parameters to integers
    const pageNum = typeof page === 'string' ? parseInt(page, 10) : page;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : limit;
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: Prisma.ParcelWhereInput = {
      deletedAt: null,
    };

    // Filter based on user role and permissions
    if (userRole === 'CUSTOMER' && userId) {
      // Get user details to check name and email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      if (user) {
        where.OR = [
          { senderId: userId },
          { recipientId: userId },
          { senderName: user.name },
          { recipientName: user.name },
          { senderEmail: user.email },
          { recipientEmail: user.email }
        ];
      } else {
        // Fallback to just ID if user not found
        where.OR = [{ senderId: userId }, { recipientId: userId }];
      }
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

    // Apply search filter (combine with existing OR conditions)
    if (search) {
      const searchConditions = [
        { trackingNumber: { contains: search, mode: 'insensitive' as const } },
        { senderName: { contains: search, mode: 'insensitive' as const } },
        { recipientName: { contains: search, mode: 'insensitive' as const } },
        { pickupAddress: { contains: search, mode: 'insensitive' as const } },
        { deliveryAddress: { contains: search, mode: 'insensitive' as const } },
      ];

      if (where.OR) {
        // If there are existing OR conditions (from role filtering), combine them
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    if (status) {
      where.status = status;
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
        take: limitNum,
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
      page: pageNum,
      limit: limitNum,
    };
  }

  // Find parcel by ID
  async findOne(
    id: string,
    userId?: string,
    userRole?: string,
  ): Promise<ParcelResponseDto> {
    const where: Prisma.ParcelWhereInput = {
      id,
      deletedAt: null,
    };

    // Add role-based filtering
    if (userRole === 'CUSTOMER' && userId) {
      // Get user details to check name and email
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true }
      });

      if (user) {
        where.OR = [
          { senderId: userId },
          { recipientId: userId },
          { senderName: user.name },
          { recipientName: user.name },
          { senderEmail: user.email },
          { recipientEmail: user.email }
        ];
      } else {
        // Fallback to just ID if user not found
        where.OR = [{ senderId: userId }, { recipientId: userId }];
      }
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
    await this.findOne(id, userId, userRole);

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
    const updateData: Prisma.ParcelUpdateInput = {
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

    // Send status update email to sender
    try {
      this.logger.log(`Debug - Sender data for status update: name="${updatedParcel.senderName}", profilePicture="${updatedParcel.sender?.profilePicture}"`);
      await this.mailerService.sendParcelStatusUpdate({
        to: updatedParcel.senderEmail,
        name: updatedParcel.senderName,
        profilePicture: updatedParcel.sender?.profilePicture || undefined,
        parcelId: updatedParcel.id,
        status,
        trackingNumber: updatedParcel.trackingNumber,
        estimatedDelivery: updatedParcel.estimatedDeliveryTime?.toISOString(),
      });
      this.logger.log(
        `Status update email sent to sender: ${updatedParcel.senderEmail}`,
      );
    } catch (emailError) {
      this.logger.warn(
        `Failed to send status update email to sender ${updatedParcel.senderEmail}:`,
        emailError,
      );
    }

    // Send status update email to recipient
    try {
      this.logger.log(`Debug - Recipient data for status update: name="${updatedParcel.recipientName}", profilePicture="${updatedParcel.recipient?.profilePicture}"`);
      await this.mailerService.sendParcelStatusUpdate({
        to: updatedParcel.recipientEmail,
        name: updatedParcel.recipientName,
        profilePicture: updatedParcel.recipient?.profilePicture || undefined,
        parcelId: updatedParcel.id,
        status,
        trackingNumber: updatedParcel.trackingNumber,
        estimatedDelivery: updatedParcel.estimatedDeliveryTime?.toISOString(),
      });
      this.logger.log(
        `Status update email sent to recipient: ${updatedParcel.recipientEmail}`,
      );
    } catch (emailError) {
      this.logger.warn(
        `Failed to send status update email to recipient ${updatedParcel.recipientEmail}:`,
        emailError,
      );
    }

    // Create notifications for both sender and recipient
    try {
      // Notification for sender (if registered)
      if (updatedParcel.senderId) {
        await this.notificationsService.create({
          userId: updatedParcel.senderId,
          title: `Parcel ${status.replace('_', ' ').toUpperCase()}`,
          message: `Your parcel with tracking number ${updatedParcel.trackingNumber} is now ${status.replace('_', ' ')}.`,
          type: this.mapStatusToNotificationType(status),
          actionUrl: `/parcel/${updatedParcel.id}`,
          parcelId: updatedParcel.id,
        });
      }

      // Notification for recipient (if registered)
      if (updatedParcel.recipientId) {
        await this.notificationsService.create({
          userId: updatedParcel.recipientId,
          title: `Parcel ${status.replace('_', ' ').toUpperCase()}`,
          message: `Your parcel with tracking number ${updatedParcel.trackingNumber} is now ${status.replace('_', ' ')}.`,
          type: this.mapStatusToNotificationType(status),
          actionUrl: `/parcel/${updatedParcel.id}`,
          parcelId: updatedParcel.id,
        });
      }
    } catch (notificationError) {
      this.logger.warn(
        'Failed to create status update notifications:',
        notificationError,
      );
    }

    return this.mapToParcelResponse(updatedParcel);
  }

  // Confirm delivery (for recipients)
  async confirmDelivery(
    id: string,
    confirmationDto: DeliveryConfirmationDto,
    recipientId: string,
  ): Promise<ParcelResponseDto> {
    const { customerSignature, customerNotes } = confirmationDto;

    // Get the user's email to check if they are the recipient
    const user = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify parcel is assigned to this recipient
    // Check both by recipientId and by recipientEmail
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id,
        OR: [
          { recipientId },
          { recipientEmail: user.email }
        ],
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

    // Create notifications for both sender and recipient
    try {
      // Notification for sender (if registered)
      if (updatedParcel.senderId) {
        await this.notificationsService.create({
          userId: updatedParcel.senderId,
          title: 'Parcel Delivered',
          message: `Your parcel with tracking number ${updatedParcel.trackingNumber} has been delivered to the recipient.`,
          type: 'PARCEL_DELIVERED',
          actionUrl: `/parcel/${updatedParcel.id}`,
          parcelId: updatedParcel.id,
        });
      }

      // Notification for recipient (if registered)
      if (updatedParcel.recipientId) {
        await this.notificationsService.create({
          userId: updatedParcel.recipientId,
          title: 'Parcel Delivered',
          message: `Your parcel with tracking number ${updatedParcel.trackingNumber} has been delivered successfully.`,
          type: 'PARCEL_DELIVERED',
          actionUrl: `/parcel/${updatedParcel.id}`,
          parcelId: updatedParcel.id,
        });
      }
    } catch (notificationError) {
      this.logger.warn(
        'Failed to create delivery confirmation notifications:',
        notificationError,
      );
    }

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

  // Mark parcel as completed (for customers)
  async markAsCompleted(
    id: string,
    markAsCompletedDto: MarkAsCompletedDto,
    userId: string,
  ): Promise<ParcelResponseDto> {
    const { customerNotes } = markAsCompletedDto;

    this.logger.log(`Attempting to mark parcel ${id} as completed by user ${userId}`);

    // Get the user's email to check if they are the recipient
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify parcel is assigned to this user (customer) and is in a state ready for completion
    // Check both by recipientId and by recipientEmail
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id,
        OR: [
          { recipientId: userId },
          { recipientEmail: user.email }
        ],
        status: {
          in: ['delivered_to_recipient', 'delivered']
        },
        deletedAt: null,
      },
    });

    if (!parcel) {
      // Let's check what the parcel status actually is
      const parcelCheck = await this.prisma.parcel.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
          recipientId: true,
          recipientEmail: true,
          senderId: true,
        },
      });

      this.logger.error(`Parcel not found or not ready for completion. Parcel check:`, parcelCheck);
      this.logger.error(`User email: ${user.email}`);
      throw new NotFoundException(
        'Parcel not found or not ready for completion',
      );
    }

    this.logger.log(`Found parcel ${id} with status ${parcel.status}, proceeding with completion`);

    // Update parcel status
    const updatedParcel = await this.prisma.parcel.update({
      where: { id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completedBy: userId,
        notes: customerNotes,
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
        status: 'completed',
        location: updatedParcel.currentLocation,
        latitude: updatedParcel.latitude,
        longitude: updatedParcel.longitude,
        updatedBy: userId,
        notes: 'Parcel completed by customer',
      },
    });

    // Create notifications for both sender and recipient
    try {
      // Notification for sender (if registered)
      if (updatedParcel.senderId) {
        await this.notificationsService.create({
          userId: updatedParcel.senderId,
          title: 'Parcel Completed',
          message: `Your parcel with tracking number ${updatedParcel.trackingNumber} has been marked as completed by the recipient.`,
          type: 'PARCEL_COMPLETED',
          actionUrl: `/parcel/${updatedParcel.id}`,
          parcelId: updatedParcel.id,
        });
      }

      // Notification for recipient (if registered)
      if (updatedParcel.recipientId) {
        await this.notificationsService.create({
          userId: updatedParcel.recipientId,
          title: 'Parcel Completed',
          message: `Your parcel with tracking number ${updatedParcel.trackingNumber} has been marked as completed. You can now leave a review.`,
          type: 'PARCEL_COMPLETED',
          actionUrl: `/parcel/${updatedParcel.id}`,
          parcelId: updatedParcel.id,
        });
      }
    } catch (notificationError) {
      this.logger.warn(
        'Failed to create completion notifications:',
        notificationError,
      );
    }

    // Send completion emails to both sender and recipient
    try {
      const completedAt = new Date();
      
      // Email to sender
      if (updatedParcel.senderEmail) {
        this.logger.log(`Debug - Sender data for completion: name="${updatedParcel.senderName}", profilePicture="${updatedParcel.sender?.profilePicture}"`);
        this.logger.log(`Debug - Sender user object:`, JSON.stringify(updatedParcel.sender, null, 2));
        await this.mailerService.sendParcelCompletedEmail({
          to: updatedParcel.senderEmail,
          name: updatedParcel.senderName,
          profilePicture: updatedParcel.sender?.profilePicture || undefined,
          parcelId: updatedParcel.id,
          trackingNumber: updatedParcel.trackingNumber,
          completedAt: completedAt,
        });
      }

      // Email to recipient
      if (updatedParcel.recipientEmail) {
        this.logger.log(`Debug - Recipient data for completion: name="${updatedParcel.recipientName}", profilePicture="${updatedParcel.recipient?.profilePicture}"`);
        this.logger.log(`Debug - Recipient user object:`, JSON.stringify(updatedParcel.recipient, null, 2));
        await this.mailerService.sendParcelCompletedEmail({
          to: updatedParcel.recipientEmail,
          name: updatedParcel.recipientName,
          profilePicture: updatedParcel.recipient?.profilePicture || undefined,
          parcelId: updatedParcel.id,
          trackingNumber: updatedParcel.trackingNumber,
          completedAt: completedAt,
        });
      }
    } catch (emailError) {
      this.logger.warn(
        'Failed to send completion emails:',
        emailError,
      );
    }

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
    console.log(
      `🔍 Service - getUserParcels(userId: ${userId}, type: ${type})`,
    );

    // First, get the user details to check name and email
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return [];
    }

    console.log(`👤 User details:`, { name: user.name, email: user.email });

    const where: Prisma.ParcelWhereInput = {
      deletedAt: null,
    };

    if (type === 'sent') {
      where.OR = [
        { senderId: userId },
        { senderName: user.name },
        { senderEmail: user.email }
      ];
      console.log(`📋 Sent query - checking senderId: ${userId}, senderName: ${user.name}, senderEmail: ${user.email}`);
    } else {
      where.OR = [
        { recipientId: userId },
        { recipientName: user.name },
        { recipientEmail: user.email }
      ];
      console.log(`📋 Received query - checking recipientId: ${userId}, recipientName: ${user.name}, recipientEmail: ${user.email}`);
    }

    console.log(`📋 Final where clause:`, JSON.stringify(where, null, 2));

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

    console.log(`📦 Database query result: ${parcels.length} parcels`);
    
    if (parcels.length > 0) {
      console.log(`📦 First parcel details:`, {
        id: parcels[0].id,
        trackingNumber: parcels[0].trackingNumber,
        senderId: parcels[0].senderId,
        recipientId: parcels[0].recipientId,
        senderName: parcels[0].senderName,
        recipientName: parcels[0].recipientName,
        status: parcels[0].status,
        createdAt: parcels[0].createdAt,
        updatedAt: parcels[0].updatedAt
      });
    } else {
      console.log(`📦 No parcels found for user ${userId} (type: ${type})`);
    }

    parcels.forEach((p, i) => {
      console.log(
        `  Parcel ${i + 1}: ${p.trackingNumber} (${p.senderName} → ${p.recipientName})`,
      );
      console.log(`    senderId: ${p.senderId}, recipientId: ${p.recipientId}`);
    });

    const result = parcels.map((parcel) => this.mapToParcelResponse(parcel));
    console.log(`✅ Returning ${result.length} parcels for ${type} query`);

    return result;
  }

  // Get driver's assigned parcels
  async getDriverParcels(
    driverId: string,
    status?: string,
  ): Promise<ParcelResponseDto[]> {
    const where: Prisma.ParcelWhereInput = {
      driverId,
      deletedAt: null,
    };

    if (status) {
      where.status = status as Prisma.EnumParcelStatusFilter;
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
        reviews: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return parcels.map((parcel) => this.mapToParcelResponse(parcel));
  }

  // Link anonymous parcels to user (enhanced version)
  async linkAnonymousParcelsToUser(
    userId: string,
    userEmail: string,
  ): Promise<{
    linkedParcels: number;
    message: string;
  }> {
    try {
      // Find all parcels where senderId is null and senderEmail matches the new user's email
      const anonymousParcels = await this.prisma.parcel.findMany({
        where: {
          senderId: null,
          senderEmail: userEmail,
        },
      });

      if (anonymousParcels.length === 0) {
        return {
          linkedParcels: 0,
          message: 'No anonymous parcels found for this email address.',
        };
      }

      // Update all matching parcels to link them to the new user
      const updateResult = await this.prisma.parcel.updateMany({
        where: {
          senderId: null,
          senderEmail: userEmail,
        },
        data: {
          senderId: userId,
        },
      });

      // Update user's total parcels sent count
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          totalParcelsEverSent: {
            increment: anonymousParcels.length,
          },
        },
      });

      this.logger.log(
        `Linked ${updateResult.count} anonymous parcels to user ${userId} (${userEmail})`,
      );

      return {
        linkedParcels: updateResult.count,
        message: `Successfully linked ${updateResult.count} previous parcels to your account.`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to link anonymous parcels for user ${userId}:`,
        error,
      );
      return {
        linkedParcels: 0,
        message: 'Failed to link previous parcels to your account.',
      };
    }
  }

  // Enhanced method to link parcels to both sender and recipient
  async linkParcelToUsers(
    parcelId: string,
    senderId?: string,
    recipientId?: string,
  ): Promise<{
    success: boolean;
    message: string;
    updatedParcel?: any;
  }> {
    try {
      // Get the parcel first
      const parcel = await this.prisma.parcel.findUnique({
        where: { id: parcelId },
      });

      if (!parcel) {
        return {
          success: false,
          message: 'Parcel not found.',
        };
      }

      // Prepare update data
      const updateData: any = {};

      if (senderId) {
        updateData.senderId = senderId;
      }

      if (recipientId) {
        updateData.recipientId = recipientId;
      }

      // Update the parcel
      const updatedParcel = await this.prisma.parcel.update({
        where: { id: parcelId },
        data: updateData,
        include: {
          sender: true,
          recipient: true,
          driver: true,
        },
      });

      // Update user statistics if needed
      if (senderId) {
        await this.prisma.user.update({
          where: { id: senderId },
          data: {
            totalParcelsEverSent: {
              increment: 1,
            },
          },
        });
      }

      if (recipientId) {
        await this.prisma.user.update({
          where: { id: recipientId },
          data: {
            totalParcelsReceived: {
              increment: 1,
            },
          },
        });
      }

      this.logger.log(
        `Linked parcel ${parcelId} to sender: ${senderId}, recipient: ${recipientId}`,
      );

      return {
        success: true,
        message: 'Parcel successfully linked to users.',
        updatedParcel: this.mapToParcelResponse(updatedParcel),
      };
    } catch (error) {
      this.logger.error(`Failed to link parcel ${parcelId} to users:`, error);
      return {
        success: false,
        message: 'Failed to link parcel to users.',
      };
    }
  }

  // Link parcels by email matching (for bulk operations)
  async linkParcelsByEmail(
    userEmail: string,
    userId: string,
    linkType: 'sender' | 'recipient' | 'both' = 'both',
  ): Promise<{
    success: boolean;
    linkedParcels: number;
    message: string;
  }> {
    try {
      let whereCondition: any = {};
      let updateData: any = {};

      if (linkType === 'sender' || linkType === 'both') {
        whereCondition.senderEmail = userEmail;
        whereCondition.senderId = null;
        updateData.senderId = userId;
      }

      if (linkType === 'recipient' || linkType === 'both') {
        whereCondition.recipientEmail = userEmail;
        whereCondition.recipientId = null;
        updateData.recipientId = userId;
      }

      // Find parcels to link
      const parcelsToLink = await this.prisma.parcel.findMany({
        where: whereCondition,
      });

      if (parcelsToLink.length === 0) {
        return {
          success: true,
          linkedParcels: 0,
          message: 'No parcels found to link.',
        };
      }

      // Update parcels
      const updateResult = await this.prisma.parcel.updateMany({
        where: whereCondition,
        data: updateData,
      });

      // Update user statistics
      const senderParcels = parcelsToLink.filter(
        (p) => p.senderEmail === userEmail,
      ).length;
      const recipientParcels = parcelsToLink.filter(
        (p) => p.recipientEmail === userEmail,
      ).length;

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          totalParcelsEverSent: {
            increment: senderParcels,
          },
          totalParcelsReceived: {
            increment: recipientParcels,
          },
        },
      });

      this.logger.log(
        `Linked ${updateResult.count} parcels to user ${userId} (${userEmail})`,
      );

      return {
        success: true,
        linkedParcels: updateResult.count,
        message: `Successfully linked ${updateResult.count} parcels to your account.`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to link parcels by email for user ${userId}:`,
        error,
      );
      return {
        success: false,
        linkedParcels: 0,
        message: 'Failed to link parcels to your account.',
      };
    }
  }

  // Get anonymous parcels by email (for checking before registration)
  async getAnonymousParcelsByEmail(
    email: string,
  ): Promise<ParcelResponseDto[]> {
    try {
      const parcels = await this.prisma.parcel.findMany({
        where: {
          senderId: null,
          senderEmail: email,
        },
        include: {
          recipient: true,
          driver: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return parcels.map((parcel) => this.mapToParcelResponse(parcel));
    } catch (error) {
      this.logger.error(
        `Failed to get anonymous parcels for email ${email}:`,
        error,
      );
      return [];
    }
  }

  // Get autocomplete suggestions for names and emails
  async getAutocompleteSuggestions(
    query: string,
    type: 'name' | 'email' | 'phone',
    limit: number = 10,
  ): Promise<{
    users: Array<{ id: string; name: string; email: string; phone?: string }>;
    parcelHistory: Array<{
      name: string;
      email: string;
      phone: string;
      type: 'sender' | 'recipient';
    }>;
  }> {
    try {
      const searchQuery = query.toLowerCase();

      // Get suggestions from registered users
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
          ],
          isActive: true,
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
        take: limit,
        orderBy: {
          name: 'asc',
        },
      });

      // Get suggestions from parcel history (both senders and recipients)
      const parcelHistory = await this.prisma.parcel.findMany({
        where: {
          OR: [
            { senderName: { contains: searchQuery, mode: 'insensitive' } },
            { senderEmail: { contains: searchQuery, mode: 'insensitive' } },
            { recipientName: { contains: searchQuery, mode: 'insensitive' } },
            { recipientEmail: { contains: searchQuery, mode: 'insensitive' } },
          ],
          deletedAt: null,
        },
        select: {
          senderName: true,
          senderEmail: true,
          senderPhone: true,
          recipientName: true,
          recipientEmail: true,
          recipientPhone: true,
        },
        take: limit * 2, // Get more to account for duplicates
        orderBy: {
          createdAt: 'desc',
        },
      });

      // Process parcel history to remove duplicates and format
      const parcelSuggestions = new Map<
        string,
        {
          name: string;
          email: string;
          phone: string;
          type: 'sender' | 'recipient';
        }
      >();

      parcelHistory.forEach((parcel) => {
        // Add sender suggestions
        const senderKey = `${parcel.senderEmail}-sender`;
        if (!parcelSuggestions.has(senderKey)) {
          parcelSuggestions.set(senderKey, {
            name: parcel.senderName,
            email: parcel.senderEmail,
            phone: parcel.senderPhone,
            type: 'sender',
          });
        }

        // Add recipient suggestions
        const recipientKey = `${parcel.recipientEmail}-recipient`;
        if (!parcelSuggestions.has(recipientKey)) {
          parcelSuggestions.set(recipientKey, {
            name: parcel.recipientName,
            email: parcel.recipientEmail,
            phone: parcel.recipientPhone,
            type: 'recipient',
          });
        }
      });

      // Convert to array and limit results
      const parcelHistoryArray = Array.from(parcelSuggestions.values()).slice(
        0,
        limit,
      );

      // Map users to expected format, handling null phone values
      const mappedUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || undefined,
      }));

      return {
        users: mappedUsers,
        parcelHistory: parcelHistoryArray,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get autocomplete suggestions for query "${query}":`,
        error,
      );
      return {
        users: [],
        parcelHistory: [],
      };
    }
  }

  // Get specific suggestions for sender or recipient
  async getContactSuggestions(
    query: string,
    contactType: 'sender' | 'recipient',
    limit: number = 10,
    excludeRoles: ('CUSTOMER' | 'DRIVER' | 'ADMIN')[] = ['DRIVER', 'ADMIN'],
  ): Promise<
    Array<{
      name: string;
      email: string;
      phone: string;
      isRegistered: boolean;
      userId?: string;
    }>
  > {
    try {
      const searchQuery = query.toLowerCase();
      const suggestions = new Map<
        string,
        {
          name: string;
          email: string;
          phone: string;
          isRegistered: boolean;
          userId?: string;
        }
      >();

      // Get from registered users (excluding specified roles)
      const users = await this.prisma.user.findMany({
        where: {
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
          ],
          isActive: true,
          deletedAt: null,
          role: {
            notIn: excludeRoles,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
        take: limit,
      });

      users.forEach((user) => {
        suggestions.set(user.email, {
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          isRegistered: true,
          userId: user.id,
        });
      });

      // Get from parcel history
      const parcelField = contactType === 'sender' ? 'sender' : 'recipient';
      const parcels = await this.prisma.parcel.findMany({
        where: {
          OR: [
            {
              [`${parcelField}Name`]: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
            {
              [`${parcelField}Email`]: {
                contains: searchQuery,
                mode: 'insensitive',
              },
            },
          ],
          deletedAt: null,
        },
        select: {
          [`${parcelField}Name`]: true,
          [`${parcelField}Email`]: true,
          [`${parcelField}Phone`]: true,
        },
        take: limit * 2,
        orderBy: {
          createdAt: 'desc',
        },
      });

      parcels.forEach((parcel: any) => {
        const email = parcel[`${parcelField}Email`];
        if (!suggestions.has(email)) {
          suggestions.set(email, {
            name: parcel[`${parcelField}Name`],
            email: email,
            phone: parcel[`${parcelField}Phone`],
            isRegistered: false,
          });
        }
      });

      return Array.from(suggestions.values()).slice(0, limit);
    } catch (error) {
      this.logger.error(
        `Failed to get contact suggestions for ${contactType}:`,
        error,
      );
      return [];
    }
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
      picked_up: ['in_transit', 'delivered_to_recipient', 'cancelled'],
      in_transit: ['delivered_to_recipient', 'cancelled'],
      delivered_to_recipient: ['delivered', 'cancelled'],
      delivered: ['completed', 'cancelled'],
      completed: [], // Final state - can only be reached after customer marks as complete
      cancelled: [], // Final state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  // Helper method to map parcel status to notification type
  private mapStatusToNotificationType(status: string): 
    | 'PARCEL_CREATED'
    | 'PARCEL_ASSIGNED'
    | 'PARCEL_PICKED_UP'
    | 'PARCEL_IN_TRANSIT'
    | 'PARCEL_DELIVERED_TO_RECIPIENT'
    | 'PARCEL_DELIVERED'
    | 'PARCEL_COMPLETED' {
    const statusMap: Record<string, any> = {
      'pending': 'PARCEL_CREATED',
      'assigned': 'PARCEL_ASSIGNED',
      'picked_up': 'PARCEL_PICKED_UP',
      'in_transit': 'PARCEL_IN_TRANSIT',
      'delivered_to_recipient': 'PARCEL_DELIVERED_TO_RECIPIENT',
      'delivered': 'PARCEL_DELIVERED',
      'completed': 'PARCEL_COMPLETED',
    };
    
    return statusMap[status] || 'PARCEL_CREATED';
  }

  private mapToParcelResponse(
    parcel: Parcel & {
      sender?: User | null;
      recipient?: User | null;
      driver?: User | null;
      statusHistory?: unknown[];
      reviews?: unknown[];
      deliveryProof?: unknown;
    },
  ): ParcelResponseDto {
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

  private mapToUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      address: user.address || undefined,
      profilePicture: user.profilePicture || undefined,
      role: user.role,
      isActive: user.isActive,
      licenseNumber: user.licenseNumber || undefined,
      vehicleNumber: user.vehicleNumber || undefined,
      vehicleType: user.vehicleType || undefined,
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

  /**
   * Calculate delivery fee based on weight and estimated distance
   * @param weight - Parcel weight in kg
   * @param pickupAddress - Pickup address
   * @param deliveryAddress - Delivery address
   * @returns Calculated delivery fee in KSH
   */
  public calculateDeliveryFee(
    weight: number,
    pickupAddress: string,
    deliveryAddress: string,
  ): number {
    const baseFee = 500; // Base delivery fee in KES
    const weightFee = weight * 100; // 100 KES per kg
    const distanceFee = this.estimateDistanceFee(pickupAddress, deliveryAddress);
    
    return baseFee + weightFee + distanceFee;
  }

  /**
   * Estimate distance fee based on address complexity
   * This is a simplified version - in a real app, you'd use geocoding APIs
   */
  private estimateDistanceFee(
    pickupAddress: string,
    deliveryAddress: string,
  ): number {
    // Simple estimation based on address length and complexity
    const pickupComplexity = pickupAddress.length / 10;
    const deliveryComplexity = deliveryAddress.length / 10;

    // Base distance fee
    let distanceFee = DELIVERY_FEE_CONFIG.MIN_DISTANCE_FEE;

    // Add complexity-based fee
    distanceFee += (pickupComplexity + deliveryComplexity) * 25;

    // Cap the distance fee at maximum
    return Math.min(distanceFee, DELIVERY_FEE_CONFIG.MAX_DISTANCE_FEE);
  }
}
