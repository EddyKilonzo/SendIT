// Review DTOs
export interface CreateReviewDto {
  parcelId: string;
  rating: number; // 1-5 stars
  comment: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface ReviewResponseDto {
  id: string;
  parcelId: string;
  reviewerId: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  // Customer information for frontend display
  customerName?: string;
  customerId?: string;
  customerProfilePicture?: string | undefined;
  driverName?: string;
  driverId?: string;
  reviewer?: any; // UserResponseDto
  parcel?: any; // ParcelResponseDto
}

export interface ReviewSummaryDto {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentReviews: ReviewResponseDto[];
}

export interface ReviewsQueryDto {
  page?: number;
  limit?: number;
  parcelId?: string;
  reviewerId?: string;
  rating?: number;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'createdAt' | 'rating';
  sortOrder?: 'asc' | 'desc';
}
