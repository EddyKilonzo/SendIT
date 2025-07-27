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
  comment: string;
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
        status: 'delivered',
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

    // Verify reviewer is the sender or recipient of the parcel
    if (parcel.senderId !== reviewerId && parcel.recipientId !== reviewerId) {
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

    // Check if review exists and belongs to user
    const review = await this.prisma.review.findFirst({
      where: {
        id,
        reviewerId: userId,
      },
    });

    if (!review) {
      throw new NotFoundException(
        'Review not found or you do not have permission to edit it',
      );
    }

    // Validate rating if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Update review
    const updatedReview = await this.prisma.review.update({
      where: { id },
      data: {
        rating,
        comment,
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

    return this.mapToReviewResponse(updatedReview as ReviewWithRelations);
  }

  // Delete review - only by the reviewer
  async remove(id: string, userId: string): Promise<{ message: string }> {
    // Check if review exists and belongs to user
    const review = await this.prisma.review.findFirst({
      where: {
        id,
        reviewerId: userId,
      },
    });

    if (!review) {
      throw new NotFoundException(
        'Review not found or you do not have permission to delete it',
      );
    }

    // Delete review
    await this.prisma.review.delete({
      where: { id },
    });

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

  // Helper method to map review to response DTO
  private mapToReviewResponse(review: ReviewWithRelations): ReviewResponseDto {
    return {
      id: review.id,
      parcelId: review.parcelId,
      reviewerId: review.reviewerId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
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
      role: user.role as 'CUSTOMER' | 'DRIVER' | 'ADMIN',
      isActive: user.isActive,
      licenseNumber: user.licenseNumber || undefined,
      vehicleNumber: user.vehicleNumber || undefined,
      vehicleType:
        (user.vehicleType as 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK') ||
        undefined,
      isAvailable: user.isAvailable || undefined,
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
      sender: parcel.sender ? this.mapToUserResponse(parcel.sender) : undefined,
      recipient: parcel.recipient
        ? this.mapToUserResponse(parcel.recipient)
        : undefined,
      driver: parcel.driver ? this.mapToUserResponse(parcel.driver) : undefined,
      statusHistory: parcel.statusHistory || [],
      reviews: parcel.reviews || [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      deliveryProof: parcel.deliveryProof || null,
    };
  }
}
