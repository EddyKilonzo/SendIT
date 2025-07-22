// Review DTOs
export interface CreateReviewDto {
  parcelId: string;
  revieweeId?: string; // Driver being reviewed (optional)
  rating: number; // 1-5 stars
  comment?: string;
  reviewType:
    | 'SERVICE'
    | 'DRIVER'
    | 'DELIVERY_SPEED'
    | 'COMMUNICATION'
    | 'OVERALL';
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
  isPublic?: boolean;
}

export interface ReviewResponseDto {
  id: string;
  parcelId: string;
  reviewerId: string;
  revieweeId?: string;
  rating: number;
  comment?: string;
  reviewType:
    | 'SERVICE'
    | 'DRIVER'
    | 'DELIVERY_SPEED'
    | 'COMMUNICATION'
    | 'OVERALL';
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  reviewer?: any; // UserResponseDto
  reviewee?: any; // UserResponseDto
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
  revieweeId?: string;
  reviewType?:
    | 'SERVICE'
    | 'DRIVER'
    | 'DELIVERY_SPEED'
    | 'COMMUNICATION'
    | 'OVERALL';
  rating?: number;
  minRating?: number;
  maxRating?: number;
  isPublic?: boolean;
  sortBy?: 'createdAt' | 'rating' | 'reviewType';
  sortOrder?: 'asc' | 'desc';
}
