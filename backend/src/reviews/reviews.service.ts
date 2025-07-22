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

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  // Create review
  async create(
    createReviewDto: CreateReviewDto,
    reviewerId: string,
  ): Promise<ReviewResponseDto> {
    const { parcelId, revieweeId, rating, comment, reviewType } =
      createReviewDto;

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

    // Validate reviewee if provided
    if (revieweeId) {
      if (revieweeId === reviewerId) {
        throw new BadRequestException('You cannot review yourself');
      }

      // Check if reviewee is the driver of this parcel
      if (parcel.driverId !== revieweeId) {
        throw new BadRequestException('Invalid reviewee for this parcel');
      }
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        parcelId,
        reviewerId,
        revieweeId,
        rating,
        comment,
        reviewType,
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
        reviewee: true,
      },
    });

    // Update user ratings if reviewing a driver
    if (revieweeId) {
      await this.updateDriverRating(revieweeId);
    }

    return this.mapToReviewResponse(review);
  }

  // Find all reviews with filtering
  async findAll(query: ReviewsQueryDto): Promise<{
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
      revieweeId,
      reviewType,
      rating,
      minRating,
      maxRating,
      isPublic,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (parcelId) {
      where.parcelId = parcelId;
    }

    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    if (revieweeId) {
      where.revieweeId = revieweeId;
    }

    if (reviewType) {
      where.reviewType = reviewType;
    }

    if (rating) {
      where.rating = rating;
    }

    if (minRating || maxRating) {
      where.rating = {};
      if (minRating) {
        where.rating.gte = minRating;
      }
      if (maxRating) {
        where.rating.lte = maxRating;
      }
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
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
          reviewee: true,
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      reviews: reviews.map((review) => this.mapToReviewResponse(review)),
      total,
      page,
      limit,
    };
  }

  // Find review by ID
  async findOne(id: string): Promise<ReviewResponseDto> {
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
        reviewee: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.mapToReviewResponse(review);
  }

  // Update review
  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
  ): Promise<ReviewResponseDto> {
    const { rating, comment, isPublic } = updateReviewDto;

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
        isPublic,
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
        reviewee: true,
      },
    });

    // Update driver rating if this review is for a driver
    if (review.revieweeId) {
      await this.updateDriverRating(review.revieweeId);
    }

    return this.mapToReviewResponse(updatedReview);
  }

  // Delete review
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

    // Update driver rating if this review was for a driver
    if (review.revieweeId) {
      await this.updateDriverRating(review.revieweeId);
    }

    return { message: 'Review deleted successfully' };
  }

  // Get review summary for a user (driver)
  async getReviewSummary(userId: string): Promise<ReviewSummaryDto> {
    // Get all reviews for this user
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        isPublic: true,
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
      .map((review) => this.mapToReviewResponse(review));

    return {
      averageRating: Math.round(averageRating * 100) / 100, // Round to 2 decimal places
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
        isPublic: true,
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
        reviewee: true,
      },
    });

    return reviews.map((review) => this.mapToReviewResponse(review));
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
        reviewee: true,
      },
    });

    return reviews.map((review) => this.mapToReviewResponse(review));
  }

  // Get reviews received by user (for drivers)
  async getReviewsReceived(userId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        isPublic: true,
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
        reviewee: true,
      },
    });

    return reviews.map((review) => this.mapToReviewResponse(review));
  }

  // Helper method to update driver rating
  private async updateDriverRating(driverId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId: driverId,
        isPublic: true,
      },
    });

    if (reviews.length === 0) {
      await this.prisma.user.update({
        where: { id: driverId },
        data: {
          averageRating: 0,
          totalRatings: 0,
        },
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await this.prisma.user.update({
      where: { id: driverId },
      data: {
        averageRating: Math.round(averageRating * 100) / 100,
        totalRatings: reviews.length,
      },
    });
  }

  // Helper method to map review to response DTO
  private mapToReviewResponse(review: any): ReviewResponseDto {
    return {
      id: review.id,
      parcelId: review.parcelId,
      reviewerId: review.reviewerId,
      revieweeId: review.revieweeId,
      rating: review.rating,
      comment: review.comment,
      reviewType: review.reviewType,
      isPublic: review.isPublic,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      reviewer: review.reviewer
        ? this.mapToUserResponse(review.reviewer)
        : null,
      reviewee: review.reviewee
        ? this.mapToUserResponse(review.reviewee)
        : null,
      parcel: review.parcel ? this.mapToParcelResponse(review.parcel) : null,
    };
  }

  // Helper method to map user to response DTO
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

  // Helper method to map parcel to response DTO
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
}
