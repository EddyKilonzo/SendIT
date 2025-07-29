import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateReviewDto,
  UpdateReviewDto,
  ReviewResponseDto,
  ReviewSummaryDto,
  ReviewsQueryDto,
} from './dto';
import { UserResponseDto } from '../users/dto';
import { ParcelResponseDto } from '../parcels/dto';

// Type definitions for Prisma query results
interface ReviewWithRelations {
  id: string;
  parcelId: string;
  reviewerId: string;
  rating: number;
  comment: string | null;
  reviewType: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  parcel?: ParcelWithRelations | null;
  reviewer?: UserWithRelations | null;
}

interface ParcelWithRelations {
  id: string;
  trackingNumber: string;
  senderId: string | null;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientId: string | null;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  driverId: string | null;
  assignedAt: Date | null;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation: string | null;
  status: string;
  weight: number;
  description: string | null;
  value: number | null;
  deliveryInstructions: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  estimatedPickupTime: Date | null;
  actualPickupTime: Date | null;
  estimatedDeliveryTime: Date | null;
  actualDeliveryTime: Date | null;
  totalDeliveryTime: number | null;
  deliveryAttempts: number;
  deliveryFee: number | null;
  paymentStatus: string;
  deliveredToRecipient: boolean;
  deliveryConfirmedAt: Date | null;
  deliveryConfirmedBy: string | null;
  customerSignature: string | null;
  customerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  sender?: UserWithRelations | null;
  recipient?: UserWithRelations | null;
  driver?: UserWithRelations | null;
  statusHistory?: Record<string, any>[];
  reviews?: ReviewWithRelations[];
  deliveryProof?: any;
}

interface UserWithRelations {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  address: string | null;
  role: string;
  isActive: boolean;
  licenseNumber: string | null;
  vehicleNumber: string | null;
  vehicleType: string | null;
  isAvailable: boolean | null;
  currentLat: number | null;
  currentLng: number | null;
  averageRating: number | null;
  totalRatings: number;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime: number | null;
  onTimeDeliveryRate: number | null;
  lastActiveAt: Date | null;
  totalEarnings: number | null;
  totalParcelsEverSent: number;
  totalParcelsReceived: number;
  preferredPaymentMethod: string | null;
  driverApplicationStatus: string | null;
  driverApplicationDate: Date | null;
  driverApprovalDate: Date | null;
  driverRejectionReason: string | null;
  profilePicture: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface ReviewWhereClause {
  parcelId?: string | { in: string[] };
  reviewerId?: string;
  rating?: number | { gte?: number; lte?: number };
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create review - only after delivery is completed
  async create(
    createReviewDto: CreateReviewDto,
    reviewerId: string,
  ): Promise<ReviewResponseDto> {
    const { parcelId, rating, comment } = createReviewDto;

    // Validate rating
    if (rating < 1 || rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if parcel exists and is delivered
    const parcel = await this.prisma.parcel.findFirst({
      where: {
        id: parcelId,
        status: { in: ['delivered', 'completed'] },
        deletedAt: null,
      },
      include: {
        sender: true,
        recipient: true,
        driver: true,
      },
    });

    if (!parcel) {
      throw new NotFoundException('Parcel not found or not delivered');
    }

    // Get the current user to check their email
    const currentUser = await this.prisma.user.findUnique({
      where: { id: reviewerId },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Verify reviewer is the sender or recipient of the parcel
    // Check by ID first, then by email for cases where recipientId is null
    const isSender = parcel.senderId === reviewerId;
    const isRecipient = parcel.recipientId === reviewerId;
    const isSenderByEmail = parcel.senderEmail === currentUser.email;
    const isRecipientByEmail = parcel.recipientEmail === currentUser.email;

    if (!isSender && !isRecipient && !isSenderByEmail && !isRecipientByEmail) {
      throw new ForbiddenException(
        'You can only review parcels you sent or received',
      );
    }

    // Check if user has already reviewed this parcel
    const existingReview = await this.prisma.review.findFirst({
      where: {
        parcelId,
        reviewerId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this parcel');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        parcelId,
        reviewerId,
        rating,
        comment,
        reviewType: 'SERVICE', // Default type for simplicity
        isPublic: true,
      },
      include: {
        parcel: {
          include: {
            sender: true,
            recipient: true,
            driver: true,
          },
        },
        reviewer: true,
      },
    });

    // Update driver rating if the parcel has a driver
    if (parcel.driverId) {
      await this.updateDriverRating(parcel.driverId);
    }

    return this.mapToReviewResponse(review as ReviewWithRelations);
  }

  // Find all reviews with filtering - Admin can see all, Driver can see their reviews
  async findAll(
    query: ReviewsQueryDto,
    userRole: string,
    userId?: string,
  ): Promise<{
    reviews: ReviewResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      parcelId,
      reviewerId,
      rating,
      minRating,
      maxRating,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: ReviewWhereClause = {};

    // Admin can see all reviews
    // Driver can only see reviews for parcels they delivered
    if (userRole === 'DRIVER' && userId) {
      const driverParcels = await this.prisma.parcel.findMany({
        where: { driverId: userId },
        select: { id: true },
      });
      where.parcelId = { in: driverParcels.map((p) => p.id) };
    }

    if (parcelId) {
      where.parcelId = parcelId;
    }

    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    if (rating) {
      where.rating = rating;
    }

    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) {
        (where.rating as { gte?: number; lte?: number }).gte = minRating;
      }
      if (maxRating) {
        (where.rating as { gte?: number; lte?: number }).lte = maxRating;
      }
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: where as any,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          parcel: {
            include: {
              sender: true,
              recipient: true,
              driver: true,
            },
          },
          reviewer: true,
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      this.prisma.review.count({ where: where as any }),
    ]);

    return {
      reviews: reviews.map((review) =>
        this.mapToReviewResponse(review as ReviewWithRelations),
      ),
      total,
      page,
      limit,
    };
  }

  // Find review by ID
  async findOne(
    id: string,
    userRole: string,
    userId?: string,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        parcel: {
          include: {
            sender: true,
            recipient: true,
            driver: true,
          },
        },
        reviewer: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Check access permissions
    if (userRole === 'DRIVER' && userId) {
      const parcel = await this.prisma.parcel.findUnique({
        where: { id: review.parcelId },
      });
      if (parcel?.driverId !== userId) {
        throw new ForbiddenException(
          'You can only view reviews for parcels you delivered',
        );
      }
    }

    return this.mapToReviewResponse(review as ReviewWithRelations);
  }

  // Update review - only by the reviewer
  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
  ): Promise<ReviewResponseDto> {
    const { rating, comment } = updateReviewDto;

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Check if review exists and belongs to user
    const existingReview = await this.prisma.review.findFirst({
      where: {
        id,
        reviewerId: userId,
      },
      include: {
        parcel: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!existingReview) {
      throw new NotFoundException('Review not found or you are not authorized to update it');
    }

    // Update review
    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
      },
      include: {
        parcel: {
          include: {
            sender: true,
            recipient: true,
            driver: true,
          },
        },
        reviewer: true,
      },
    });

    // Update driver rating if the parcel has a driver
    if (existingReview.parcel?.driverId) {
      await this.updateDriverRating(existingReview.parcel.driverId);
    }

    return this.mapToReviewResponse(updatedReview as ReviewWithRelations);
  }

  // Delete review - only by the reviewer
  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Check if review exists and belongs to user
    const existingReview = await this.prisma.review.findFirst({
      where: {
        id,
        reviewerId: userId,
      },
      include: {
        parcel: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!existingReview) {
      throw new NotFoundException(
        'Review not found or you do not have permission to delete it',
      );
    }

    // Delete review
    await this.prisma.review.delete({
      where: { id },
    });

    // Update driver rating if the parcel has a driver
    if (existingReview.parcel?.driverId) {
      await this.updateDriverRating(existingReview.parcel.driverId);
    }

    return { message: 'Review deleted successfully' };
  }

  // Get review summary for a driver
  async getDriverReviewSummary(driverId: string): Promise<ReviewSummaryDto> {
    // Get all reviews for parcels delivered by this driver
    const driverParcels = await this.prisma.parcel.findMany({
      where: { driverId },
      select: { id: true },
    });

    const reviews = await this.prisma.review.findMany({
      where: {
        parcelId: { in: driverParcels.map((p) => p.id) },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        reviewer: true,
        parcel: true,
      },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentReviews: [],
      };
    }

    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    // Calculate rating distribution
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;
    });

    // Get recent reviews (last 5)
    const recentReviews = reviews
      .slice(0, 5)
      .map((review) => this.mapToReviewResponse(review as ReviewWithRelations));

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalReviews: reviews.length,
      ratingDistribution,
      recentReviews,
    };
  }

  // Get reviews for a specific parcel
  async getParcelReviews(parcelId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        parcelId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        parcel: {
          include: {
            sender: true,
            recipient: true,
            driver: true,
          },
        },
        reviewer: true,
      },
    });

    return reviews.map((review) =>
      this.mapToReviewResponse(review as ReviewWithRelations),
    );
  }

  // Get user's reviews (reviews written by user)
  async getUserReviews(userId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        reviewerId: userId,
      },
      include: {
        parcel: {
          include: {
            driver: { select: { name: true } },
            sender: { select: { name: true } },
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            email: true,
            profilePicture: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews.map((review) => this.mapToReviewResponse(review as unknown as ReviewWithRelations));
  }

  async getReviewStats(): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: Array<{ stars: number; count: number; percentage: number }>;
  }> {
    const [totalStats, ratingDistribution] = await Promise.all([
      this.prisma.review.aggregate({
        _count: { id: true },
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        _count: { id: true },
      }),
    ]);

    const totalReviews = totalStats._count?.id || 0;
    const averageRating = totalStats._avg?.rating || 0;

    // Calculate rating distribution
    const distribution = [5, 4, 3, 2, 1].map(stars => {
      const ratingGroup = ratingDistribution.find(r => r.rating === stars);
      const count = ratingGroup?._count?.id || 0;
      const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
      return { stars, count, percentage };
    });

    return {
      totalReviews,
      averageRating,
      ratingDistribution: distribution,
    };
  }

  // Helper method to map review to response DTO
  private mapToReviewResponse(review: ReviewWithRelations): ReviewResponseDto {
    return {
      id: review.id,
      parcelId: review.parcelId,
      reviewerId: review.reviewerId,
      rating: review.rating,
      comment: review.comment || '',
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      // Add customer information for frontend display
      customerName: review.reviewer?.name || review.parcel?.sender?.name || 'Unknown Customer',
      customerId: review.reviewer?.id || review.parcel?.sender?.id || '',
      customerProfilePicture: review.reviewer?.profilePicture || review.parcel?.sender?.profilePicture || undefined,
      driverName: review.parcel?.driver?.name || 'Unknown Driver',
      driverId: review.parcel?.driver?.id || '',
      reviewer: review.reviewer
        ? this.mapToUserResponse(review.reviewer)
        : undefined,
      parcel: review.parcel
        ? this.mapToParcelResponse(review.parcel)
        : undefined,
    };
  }

  // Helper method to map user to response DTO
  private mapToUserResponse(user: UserWithRelations): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      address: user.address || undefined,
      profilePicture: user.profilePicture || undefined,
      role: user.role as 'CUSTOMER' | 'DRIVER' | 'ADMIN',
      isActive: user.isActive,
      licenseNumber: user.licenseNumber || undefined,
      vehicleNumber: user.vehicleNumber || undefined,
      vehicleType:
        (user.vehicleType as 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK') ||
        undefined,
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
      driverApplicationStatus:
        (user.driverApplicationStatus as
          | 'NOT_APPLIED'
          | 'PENDING'
          | 'APPROVED'
          | 'REJECTED') || undefined,
      driverApplicationDate: user.driverApplicationDate || undefined,
      driverApprovalDate: user.driverApprovalDate || undefined,
      driverRejectionReason: user.driverRejectionReason || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // Helper method to map parcel to response DTO
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
        | 'completed'
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
    };
  }

  /**
   * Update driver rating based on all reviews received
   */
  private async updateDriverRating(driverId: string): Promise<void> {
    try {
      // Get all reviews for parcels delivered by this driver
      const reviews = await this.prisma.review.findMany({
        where: {
          parcel: {
            driverId: driverId,
            status: { in: ['delivered', 'completed'] },
            deletedAt: null,
          },
        },
        select: {
          rating: true,
        },
      });

      if (reviews.length === 0) {
        // No reviews yet, set default values
        await this.prisma.user.update({
          where: { id: driverId },
          data: {
            averageRating: 0,
            totalRatings: 0,
          },
        });
        return;
      }

      // Calculate average rating
      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      // Update driver's rating
      await this.prisma.user.update({
        where: { id: driverId },
        data: {
          averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
          totalRatings: reviews.length,
        },
      });
    } catch (error) {
      console.error('Error updating driver rating:', error);
      // Don't throw error to avoid breaking review creation
    }
  }

  /**
   * Recalculate all driver ratings (useful for fixing existing data)
   */
  async recalculateAllDriverRatings(): Promise<{ message: string; updatedDrivers: number }> {
    try {
      // Get all drivers
      const drivers = await this.prisma.user.findMany({
        where: {
          role: 'DRIVER',
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      let updatedCount = 0;

      // Update each driver's rating
      for (const driver of drivers) {
        await this.updateDriverRating(driver.id);
        updatedCount++;
      }

      return {
        message: `Successfully recalculated ratings for ${updatedCount} drivers`,
        updatedDrivers: updatedCount,
      };
    } catch (error) {
      console.error('Error recalculating driver ratings:', error);
      throw new Error('Failed to recalculate driver ratings');
    }
  }
}
