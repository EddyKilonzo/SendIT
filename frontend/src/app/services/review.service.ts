import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface CreateReviewDto {
  parcelId: string;
  rating: number;
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
  reviewer?: any;
  parcel?: any;
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

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): { [key: string]: string } {
    const token = this.authService.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private getApiUrl(endpoint: string): string {
    return `${this.baseUrl}/reviews${endpoint}`;
  }

  private handleError(error: any): Observable<never> {
    console.error('Review service error:', error);
    let errorMessage = 'An error occurred while processing your request.';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Create a new review
  createReview(createReviewDto: CreateReviewDto): Observable<ReviewResponseDto> {
    return this.http.post<ReviewResponseDto>(
      this.getApiUrl(''),
      createReviewDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get all reviews (admin only)
  getReviews(query: ReviewsQueryDto = {}): Observable<{ reviews: ReviewResponseDto[]; total: number; page: number; limit: number }> {
    const params = new URLSearchParams();
    
    if (query.page) params.set('page', query.page.toString());
    if (query.limit) params.set('limit', query.limit.toString());
    if (query.parcelId) params.set('parcelId', query.parcelId);
    if (query.reviewerId) params.set('reviewerId', query.reviewerId);
    if (query.rating) params.set('rating', query.rating.toString());
    if (query.minRating) params.set('minRating', query.minRating.toString());
    if (query.maxRating) params.set('maxRating', query.maxRating.toString());
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);

    return this.http.get<{ reviews: ReviewResponseDto[]; total: number; page: number; limit: number }>(
      this.getApiUrl(`?${params.toString()}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get review by ID
  getReview(id: string): Observable<ReviewResponseDto> {
    return this.http.get<ReviewResponseDto>(
      this.getApiUrl(`/${id}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Update review
  updateReview(id: string, updateReviewDto: UpdateReviewDto): Observable<ReviewResponseDto> {
    return this.http.patch<ReviewResponseDto>(
      this.getApiUrl(`/${id}`),
      updateReviewDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Delete review
  deleteReview(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      this.getApiUrl(`/${id}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get driver review summary
  getDriverReviewSummary(driverId: string): Observable<ReviewSummaryDto> {
    return this.http.get<ReviewSummaryDto>(
      this.getApiUrl(`/driver-summary/${driverId}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get parcel reviews
  getParcelReviews(parcelId: string): Observable<ReviewResponseDto[]> {
    return this.http.get<ReviewResponseDto[]>(
      this.getApiUrl(`/parcel/${parcelId}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // Get user's reviews
  getMyReviews(): Observable<ReviewResponseDto[]> {
    return this.http.get<ReviewResponseDto[]>(
      this.getApiUrl('/my-reviews'),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }
} 