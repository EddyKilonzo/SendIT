import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from '../components/shared/toast/toast.service';
import { environment } from '../../environments/environment';
import { switchMap, of, forkJoin } from 'rxjs';
import { ReviewService } from './review.service';

export interface Parcel {
  id: string;
  trackingNumber: string;
  senderId?: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  driverId?: string;
  assignedAt?: Date;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation?: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered_to_recipient' | 'delivered' | 'completed' | 'cancelled';
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  estimatedPickupTime?: Date;
  actualPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  totalDeliveryTime?: number;
  deliveryAttempts: number;
  deliveryFee?: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  deliveredToRecipient: boolean;
  deliveryConfirmedAt?: Date;
  deliveryConfirmedBy?: string;
  customerSignature?: string;
  customerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: any;
  recipient?: any;
  driver?: any;
  statusHistory?: any[];
  reviews?: any[];
  deliveryProof?: any;
}

export interface ParcelsResponse {
  parcels: Parcel[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateParcelDto {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
}

export interface UpdateParcelDto {
  description?: string;
  value?: number;
  deliveryInstructions?: string;
}

export interface ParcelQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  assignedToMe?: boolean;
  sortBy?: 'createdAt' | 'status' | 'weight';
  sortOrder?: 'asc' | 'desc';
}

export interface ParcelStatusUpdateDto {
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  currentLocation?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface DeliveryConfirmationDto {
  customerSignature?: string;
  customerNotes?: string;
}

export interface MarkAsCompletedDto {
  customerNotes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParcelsService {
  private baseUrl = environment.apiUrl;
  private tempParcelDetails: any = null;
  private tempReassignmentData: any = null;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private toastService: ToastService,
    private reviewService: ReviewService
  ) {}

  private getHeaders(): { [key: string]: string } {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('⚠️ No authentication token found!');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  private getApiUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint}`;
  }

  private handleError(error: any): Observable<never> {
    let errorMessage = 'An unexpected error occurred';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.status === 401) {
      errorMessage = 'Authentication failed. Please login again.';
    } else if (error.status === 403) {
      errorMessage = 'Access denied. You do not have permission to perform this action.';
    } else if (error.status === 404) {
      errorMessage = 'Resource not found.';
    } else if (error.status === 422) {
      errorMessage = 'Validation error. Please check your input.';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your connection.';
    } else {
      errorMessage = `Error Code: ${error.status}`;
    }
    
    this.toastService.showError(errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  // Temporary storage for assign driver flow
  setTempParcelDetails(parcelDetails: any, isReassignment: boolean = false, currentDriverId?: string) {
    this.tempParcelDetails = parcelDetails;
    this.tempReassignmentData = {
      isReassignment,
      currentDriverId
    };
    console.log('💾 Stored temp parcel details:', parcelDetails);
    console.log('💾 Stored temp reassignment data:', this.tempReassignmentData);
  }

  getTempParcelDetails(): any {
    console.log('📤 Retrieved temp parcel details:', this.tempParcelDetails);
    return this.tempParcelDetails;
  }

  getTempReassignmentData(): any {
    console.log('📤 Retrieved temp reassignment data:', this.tempReassignmentData);
    return this.tempReassignmentData;
  }

  clearTempParcelDetails() {
    console.log('🗑️ Clearing temp parcel details');
    this.tempParcelDetails = null;
    this.tempReassignmentData = null;
    console.log('🗑️ Cleared temp parcel details');
  }

  getParcels(query: ParcelQueryDto = {}): Observable<ParcelsResponse> {
    let params = new HttpParams();
    
    Object.keys(query).forEach(key => {
      const value = query[key as keyof ParcelQueryDto];
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ParcelsResponse>(
      this.getApiUrl('/parcels'),
      { 
        headers: this.getHeaders(),
        params 
      }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getMyParcels(): Observable<ParcelsResponse> {
    return this.http.get<ParcelsResponse>(
      this.getApiUrl('/parcels/my-parcels'),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getParcel(id: string): Observable<Parcel> {
    const url = this.getApiUrl(`/parcels/${id}`);
    console.log('🌐 Making API call to:', url);
    console.log('🔑 Headers:', this.getHeaders());
    
    return this.http.get<Parcel>(
      url,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ API call failed:', error);
        return this.handleError(error);
      })
    );
  }

  getParcelById(id: string): Observable<any> {
    const url = this.getApiUrl(`/parcels/${id}`);
    console.log('🌐 Making API call to:', url);
    console.log('🔑 Headers:', this.getHeaders());
    
    return this.http.get<any>(
      url,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => {
        console.error('❌ API call failed:', error);
        return this.handleError(error);
      })
    );
  }

  createParcel(createParcelDto: CreateParcelDto): Observable<Parcel> {
    return this.http.post<Parcel>(
      this.getApiUrl('/parcels'),
      createParcelDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  updateParcel(id: string, updateParcelDto: UpdateParcelDto): Observable<Parcel> {
    return this.http.patch<Parcel>(
      this.getApiUrl(`/parcels/${id}`),
      updateParcelDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  updateParcelStatus(id: string, statusUpdateDto: ParcelStatusUpdateDto): Observable<Parcel> {
    return this.http.patch<Parcel>(
      this.getApiUrl(`/parcels/${id}/status`),
      statusUpdateDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  confirmDelivery(id: string, confirmationDto: DeliveryConfirmationDto): Observable<Parcel> {
    return this.http.patch<Parcel>(
      this.getApiUrl(`/parcels/${id}/confirm-delivery`),
      confirmationDto,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  markAsCompleted(id: string, markAsCompletedDto: MarkAsCompletedDto): Observable<Parcel> {
    const url = this.getApiUrl(`/parcels/${id}/mark-as-completed`);
    const headers = this.getHeaders();
    
    console.log('🌐 Making markAsCompleted API call to:', url);
    console.log('📦 Request data:', markAsCompletedDto);
    console.log('🔑 Headers:', headers);
    
    return this.http.patch<Parcel>(
      url,
      markAsCompletedDto,
      { headers }
    ).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  deleteParcel(id: string): Observable<void> {
    return this.http.delete<void>(
      this.getApiUrl(`/parcels/${id}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getParcelHistory(id: string): Observable<any[]> {
    return this.http.get<any[]>(
      this.getApiUrl(`/parcels/status-history/${id}`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  getParcelLocation(id: string): Observable<any> {
    return this.http.get<any>(
      this.getApiUrl(`/parcels/${id}/location`),
      { headers: this.getHeaders() }
    ).pipe(
      catchError(error => this.handleError(error))
    );
  }

  updateParcelLocation(id: string, location: { latitude: number; longitude: number; currentLocation?: string }): Observable<Parcel> {
    const url = `${this.baseUrl}/parcels/${id}/location`;
    return this.http.patch<Parcel>(url, location, { headers: this.getHeaders() })
      .pipe(catchError(this.handleError));
  }

  // Check for anonymous parcels by email (no auth required)
  getAnonymousParcels(email: string): Observable<Parcel[]> {
    const url = `${this.baseUrl}/parcels/anonymous/${encodeURIComponent(email)}`;
    return this.http.get<Parcel[]>(url)
      .pipe(catchError(this.handleError));
  }

  // Get autocomplete suggestions
  getAutocompleteSuggestions(query: string, type: 'name' | 'email' | 'phone' = 'name', limit: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('q', query)
      .set('type', type)
      .set('limit', limit.toString());
    
    const url = `${this.baseUrl}/parcels/suggestions/autocomplete`;
    return this.http.get(url, { params })
      .pipe(catchError(this.handleError));
  }

  // Get contact suggestions for sender or recipient
  getContactSuggestions(query: string, contactType: 'sender' | 'recipient', limit: number = 10, excludeRoles: string[] = ['DRIVER', 'ADMIN']): Observable<any[]> {
    const params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString())
      .set('excludeRoles', excludeRoles.join(','));
    
    const url = `${this.baseUrl}/parcels/suggestions/contact/${contactType}`;
    return this.http.get<any[]>(url, { params })
      .pipe(catchError(this.handleError));
  }

  // Get driver's assigned parcels
  getDriverParcels(status?: string): Observable<any[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    
    const url = `${this.baseUrl}/parcels/assigned`;
    return this.http.get<any[]>(url, { 
      headers: this.getHeaders(),
      params 
    }).pipe(catchError(this.handleError));
  }

  // Get driver's delivery history
  getDriverDeliveryHistory(): Observable<any[]> {
    const url = `${this.baseUrl}/parcels/assigned`;
    return this.http.get<any[]>(url, { 
      headers: this.getHeaders()
    }).pipe(
      switchMap(parcels => {
        // Filter for completed deliveries (delivered, completed, delivered_to_recipient)
        const completedDeliveries = parcels.filter(p => 
          p.status === 'delivered' || 
          p.status === 'completed' || 
          p.status === 'delivered_to_recipient'
        );
        
        // Sort by completion date (most recent first)
        const sortedDeliveries = completedDeliveries.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt);
          const dateB = new Date(b.updatedAt || b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        return of(sortedDeliveries);
      }),
      catchError(this.handleError)
    );
  }

  // Get driver performance metrics
  getDriverPerformanceMetrics(): Observable<any> {
    const url = `${this.baseUrl}/parcels/assigned`;
    return this.http.get<any[]>(url, { 
      headers: this.getHeaders()
    }).pipe(
      switchMap(parcels => {
        // Calculate metrics from parcels data
        const totalDeliveries = parcels.length;
        const completedDeliveries = parcels.filter(p => 
          p.status === 'delivered' || p.status === 'completed' || p.status === 'delivered_to_recipient'
        ).length;
        const inTransitDeliveries = parcels.filter(p => 
          ['assigned', 'picked_up', 'in_transit', 'delivered_to_recipient'].includes(p.status)
        ).length;
        const pendingDeliveries = parcels.filter(p => 
          p.status === 'assigned' || p.status === 'picked_up' || p.status === 'pending'
        ).length;
        
        // Calculate today's deliveries
        const today = new Date();
        const todayDeliveries = parcels.filter(p => {
          const parcelDate = new Date(p.createdAt);
          return parcelDate.toDateString() === today.toDateString();
        }).length;
        
        // Get current user to get driver ID
        const currentUser = this.authService.getCurrentUser();
        const driverId = currentUser?.id;
        
        if (driverId) {
          // Get driver review summary from dedicated endpoint
          return this.reviewService.getDriverReviewSummary(driverId).pipe(
            switchMap(reviewSummary => {
              console.log('Driver review summary:', reviewSummary);
              return of({
                totalDeliveries,
                completedDeliveries,
                inTransitDeliveries,
                pendingDeliveries,
                averageRating: reviewSummary.averageRating || 0,
                todayDeliveries,
                // Calculate change percentages (simplified)
                ratingChange: 0, // Could be calculated from historical data
                deliveriesChange: 0 // Could be calculated from historical data
              });
            }),
            catchError(error => {
              console.error('Error getting driver review summary:', error);
              // Fallback to parcels data if review service fails
              return of({
                totalDeliveries,
                completedDeliveries,
                inTransitDeliveries,
                pendingDeliveries,
                averageRating: 0,
                todayDeliveries,
                ratingChange: 0,
                deliveriesChange: 0
              });
            })
          );
        } else {
          // No driver ID available, return basic metrics
          return of({
            totalDeliveries,
            completedDeliveries,
            inTransitDeliveries,
            pendingDeliveries,
            averageRating: 0,
            todayDeliveries,
            ratingChange: 0,
            deliveriesChange: 0
          });
        }
      }),
      catchError(this.handleError)
    );
  }
}