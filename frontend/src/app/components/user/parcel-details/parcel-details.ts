import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../../shared/map/map.component';
import { MapService } from '../../../services/map.service';
import { MapLocation, MapCoordinates, MapError, MapMarkerType } from '../../../types/map.types';
import { ToastService } from '../../shared/toast/toast.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ParcelsService } from '../../../services/parcels.service';
import { AuthService } from '../../../services/auth.service';
import { ReviewService, CreateReviewDto, UpdateReviewDto, ReviewResponseDto } from '../../../services/review.service';
import { RealtimeService, DriverLocation } from '../../../services/realtime.service';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';

interface Parcel {
  id: string;
  weight: number;
  status: 'Pending' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Completed' | 'Cancelled';
  originalStatus?: string; // Store the original backend status
  pickupAddress: string;
  deliveryAddress: string;
  expectedDelivery?: string;
  deliveredDate?: string;
  scheduledPickup?: string;
  type?: 'sent' | 'received';
  description?: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverEmail?: string;
  trackingNumber?: string;
  currentLocation?: string;
  estimatedTime?: string;
  driver?: {
    id?: string;
    name: string;
    vehicleNumber: string;
    phone?: string;
    currentLat?: number;
    currentLng?: number;
  };
}

interface TrackingEvent {
  id: string;
  status: string;
  location: string;
  timestamp: string;
  description: string;
  icon: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  date: string;
  userName: string;
}

@Component({
  selector: 'app-parcel-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MapComponent, SidebarComponent],
  templateUrl: './parcel-details.html',
  styleUrls: ['./parcel-details.css']
})
export class ParcelDetails implements OnInit, OnDestroy {
  @ViewChild('mapComponent', { static: false }) mapComponent!: MapComponent;
  
  parcelId: string = '';
  parcel: Parcel | null = null;
  showReviewModal = false;
  
  reviewRating = 5;
  reviewComment = '';
  hasUserReviewed = false;
  userReview: Review | null = null;
  isEditingReview = false;
  showReviewPrompt = false;
  
  // User role for role-based access control
  userRole: string = 'CUSTOMER'; // Default role, will be set from auth service later
  currentUser: any = null;
  isRecipient: boolean | undefined = undefined;
  isSender: boolean | undefined = undefined;
  lastCanCompleteState: boolean | undefined = undefined;
  
  parcels: Parcel[] = [
    {
      id: '#12345',
      weight: 2,
      status: 'In Transit',
      pickupAddress: '123 Maple Street, Anytown',
      deliveryAddress: '456 Oak Avenue, Anytown',
      expectedDelivery: '2024-07-20',
      type: 'sent',
      description: 'Electronics package containing laptop and accessories',
      senderName: 'John Doe',
      receiverName: 'Jane Smith',
      trackingNumber: 'TRK123456789',
      currentLocation: 'Distribution Center, Downtown',
      estimatedTime: '2 hours',
      driver: {
        name: 'Mike Johnson',
        vehicleNumber: 'KCA 123A',
        phone: '+254-700-123-456',
        currentLat: -1.2921,
        currentLng: 36.8219
      }
    },
    {
      id: '#11223',
      weight: 3,
      status: 'Pending',
      pickupAddress: '322 Cedar Drive, Anytown',
      deliveryAddress: '333 Birch Court, Anytown',
      expectedDelivery: '2024-07-22',
      scheduledPickup: '2024-07-22',
      type: 'sent',
      description: 'Heavy machinery parts for construction project',
      senderName: 'John Doe',
      receiverName: 'Construction Co.',
      trackingNumber: 'TRK112233445',
      currentLocation: 'Pending Pickup',
      estimatedTime: 'TBD'
    },
    {
      id: '#44508',
      weight: 2.5,
      status: 'In Transit',
      pickupAddress: '444 Spruce Way, Anytown',
      deliveryAddress: '555 Willow Place, Anytown',
      expectedDelivery: '2024-07-21',
      type: 'sent',
      description: 'Medical supplies and equipment',
      senderName: 'John Doe',
      receiverName: 'City Hospital',
      trackingNumber: 'TRK445566778',
      currentLocation: 'Regional Hub',
      estimatedTime: '1 day'
    },
    {
      id: '#77889',
      weight: 1,
      status: 'Delivered',
      pickupAddress: '890 Aspen Circle, Anytown',
      deliveryAddress: '777 Redwood Boulevard, Anytown',
      expectedDelivery: '2024-07-18',
      deliveredDate: '2024-07-18',
      type: 'sent',
      description: 'Documents and legal papers',
      senderName: 'John Doe',
      receiverName: 'Law Office',
      trackingNumber: 'TRK778899001',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#67890',
      weight: 1.5,
      status: 'Delivered',
      pickupAddress: '789 Pine Lane, Anytown',
      deliveryAddress: '101 Elm Road, Anytown',
      expectedDelivery: '2024-07-15',
      deliveredDate: '2024-07-15',
      type: 'sent',
      description: 'Clothing package - Summer collection',
      senderName: 'John Doe',
      receiverName: 'Mike Johnson',
      trackingNumber: 'TRK987654321',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#99887',
      weight: 2.5,
      status: 'Delivered',
      pickupAddress: '666 Oak Drive, Anytown',
      deliveryAddress: '777 Maple Street, Anytown',
      expectedDelivery: '2024-07-10',
      deliveredDate: '2024-07-10',
      type: 'received',
      description: 'Home appliances and electronics',
      senderName: 'Electronics Store',
      receiverName: 'John Doe',
      trackingNumber: 'TRK998877665',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#55443',
      weight: 0.8,
      status: 'Delivered',
      pickupAddress: '111 Cedar Lane, Anytown',
      deliveryAddress: '222 Birch Road, Anytown',
      expectedDelivery: '2024-07-05',
      deliveredDate: '2024-07-05',
      type: 'received',
      description: 'Books and educational materials',
      senderName: 'Online Bookstore',
      receiverName: 'John Doe',
      trackingNumber: 'TRK554433221',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#33221',
      weight: 1.2,
      status: 'Delivered',
      pickupAddress: '333 Pine Avenue, Anytown',
      deliveryAddress: '444 Elm Lane, Anytown',
      expectedDelivery: '2024-07-01',
      deliveredDate: '2024-07-01',
      type: 'received',
      description: 'Garden supplies and tools',
      senderName: 'Garden Center',
      receiverName: 'John Doe',
      trackingNumber: 'TRK332211009',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    }
  ];

  trackingEvents: TrackingEvent[] = [];

  // Map-related properties
  mapMarkers: MapLocation[] = [];
  mapCenter: MapCoordinates = { lat: -1.2921, lng: 36.8219 }; // Nairobi
  showMapView: boolean = true;
  mapMarkerTypes: MapMarkerType[] = [];
  
  // Route information for tracking details
  routeDistance: string = '';
  routeDuration: string = '';
  isDriverTrackingEnabled: boolean = false;

  private driverLocationSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapService,
    private toastService: ToastService,
    private parcelsService: ParcelsService,
    private authService: AuthService,
    private reviewService: ReviewService,
    private realtimeService: RealtimeService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.userRole = this.currentUser?.role || 'CUSTOMER';
    this.parcelId = this.route.snapshot.params['id'];
    this.loadParcelDetails();

    // Subscribe to driver location updates (but don't connect immediately)
    this.driverLocationSubscription = this.realtimeService.driverLocationUpdates$.subscribe(
      (driverLocation: DriverLocation) => {
        console.log('📍 Received driver location update:', driverLocation);
        if (this.isDriverTrackingEnabled) {
          this.updateDriverLocationOnMap(driverLocation);
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.driverLocationSubscription) {
      this.driverLocationSubscription.unsubscribe();
    }
  }

  toggleDriverTracking(): void {
    this.isDriverTrackingEnabled = !this.isDriverTrackingEnabled;
    
    if (this.isDriverTrackingEnabled) {
      this.toastService.showSuccess('Live driver tracking enabled (offline mode)');
      console.log('✅ Driver tracking enabled (offline mode)');
      
      // For now, we'll work without WebSocket since backend isn't running
      // TODO: Enable WebSocket when backend is fixed
      /*
      // Connect to WebSocket if not already connected
      if (!this.realtimeService.getConnectionStatus()) {
        console.log('🔌 Connecting to WebSocket...');
        this.realtimeService.connect();
      }
      
      // Subscribe to the specific driver's location updates
      if (this.parcel?.driver?.id) {
        console.log('👤 Subscribing to driver location updates for:', this.parcel.driver.id);
        this.realtimeService.subscribeToDriver(this.parcel.driver.id);
      }
      */
      
      // If we have a driver, simulate a location update to test
      if (this.parcel?.driver) {
        console.log('🧪 Testing driver location update...');
        // Simulate a driver location update for testing
        const testLocation: DriverLocation = {
          driverId: this.parcel.driver.id || 'test-driver',
          driverName: this.parcel.driver.name,
          currentLat: this.parcel.driver.currentLat || -1.2921,
          currentLng: this.parcel.driver.currentLng || 36.8219,
          lastActiveAt: new Date(),
          vehicleNumber: this.parcel.driver.vehicleNumber,
          timestamp: new Date()
        };
        this.updateDriverLocationOnMap(testLocation);
      }
    } else {
      this.toastService.showInfo('Live driver tracking disabled');
      console.log('❌ Driver tracking disabled');
      
      // TODO: Unsubscribe when WebSocket is working
      /*
      // Unsubscribe from driver location updates
      if (this.parcel?.driver?.id) {
        console.log('👤 Unsubscribing from driver location updates for:', this.parcel.driver.id);
        this.realtimeService.unsubscribeFromDriver(this.parcel.driver.id);
      }
      */
    }
  }

  loadParcelDetails() {
    // Get parcel ID from route parameters
    this.route.params.subscribe(params => {
      this.parcelId = params['id'];
      
      if (this.parcelId) {
        this.loadParcelFromApi();
      } else {
        this.toastService.showError('Parcel ID not provided');
        this.router.navigate(['/user-parcels']);
      }
    });
  }

  private loadParcelFromApi() {
    this.parcelsService.getParcelById(this.parcelId).subscribe({
      next: (response: any) => {
        console.log('Parcel data from API:', response);
        console.log('Driver data from API:', response.driver);
        this.parcel = this.mapApiResponseToParcel(response);
        console.log('Mapped parcel data:', this.parcel);
        console.log('Mapped driver data:', this.parcel?.driver);
        
        // Reset cached values when parcel data changes
        this.resetCachedValues();
        
        this.generateTrackingEvents();
        this.checkUserReview();
        this.setupMapMarkers();
      },
      error: (error: any) => {
        console.error('Error loading parcel:', error);
        this.toastService.showError('Failed to load parcel details');
        this.router.navigate(['/user-parcels']);
      }
    });
  }

  private mapApiResponseToParcel(apiResponse: any): Parcel | null {
    // Add safety check for required fields
    if (!apiResponse || !apiResponse.id) {
      console.error('❌ Invalid API response for parcel mapping:', apiResponse);
      return null;
    }
    
    return {
      id: apiResponse.id,
      weight: apiResponse.weight || 0,
      status: this.mapStatus(apiResponse.status),
      originalStatus: apiResponse.status, // Store the original backend status
      pickupAddress: apiResponse.pickupAddress || '',
      deliveryAddress: apiResponse.deliveryAddress || '',
      expectedDelivery: this.formatDateTime(apiResponse.estimatedDeliveryTime),
      deliveredDate: this.formatDateTime(apiResponse.actualDeliveryTime),
      scheduledPickup: this.formatDateTime(apiResponse.actualPickupTime || apiResponse.estimatedPickupTime),
      type: 'sent', // Default to sent for now
      description: apiResponse.description || '',
      senderName: apiResponse.senderName || '',
      senderPhone: apiResponse.senderPhone || '',
      senderEmail: apiResponse.senderEmail || '',
      receiverName: apiResponse.recipientName || '',
      receiverPhone: apiResponse.recipientPhone || '',
      receiverEmail: apiResponse.recipientEmail || '',
      trackingNumber: apiResponse.trackingNumber || '',
      currentLocation: apiResponse.currentLocation || '',
      estimatedTime: this.calculateEstimatedTime(apiResponse.actualPickupTime || apiResponse.estimatedPickupTime, apiResponse.actualDeliveryTime || apiResponse.estimatedDeliveryTime),
      driver: apiResponse.driver ? {
        id: apiResponse.driver.id,
        name: apiResponse.driver.name || '',
        vehicleNumber: apiResponse.driver.vehicleNumber || '',
        phone: apiResponse.driver.phone || '',
        currentLat: apiResponse.driver.currentLat,
        currentLng: apiResponse.driver.currentLng
      } : undefined
    };
  }

  private mapStatus(apiStatus: string): 'Pending' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Completed' | 'Cancelled' {
    switch (apiStatus.toLowerCase()) {
      case 'pending':
      case 'assigned':
        return 'Pending';
      case 'picked_up':
      case 'in_transit':
        return 'In Transit';
      case 'delivered_to_recipient':
        return 'Delivered';
      case 'delivered':
        return 'Delivered';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  checkUserReview() {
    this.hasUserReviewed = false;
    this.userReview = null;
    
    if (this.parcel) {
      // Get parcel reviews and check if current user has reviewed
      this.reviewService.getParcelReviews(this.parcel.id).subscribe({
        next: (reviews: ReviewResponseDto[]) => {
          const currentUserId = this.authService.getCurrentUser()?.id;
          const userReview = reviews.find(review => review.reviewerId === currentUserId);
          
          if (userReview) {
            this.userReview = {
              id: userReview.id,
              rating: userReview.rating,
              comment: userReview.comment,
              date: new Date(userReview.createdAt).toISOString().split('T')[0],
              userName: 'You'
            };
            this.hasUserReviewed = true;
          }
        },
        error: (error) => {
          console.error('Error checking user review:', error);
        }
      });
    }
  }

  private resetCachedValues() {
    this.isRecipient = undefined;
    this.isSender = undefined;
    this.lastCanCompleteState = undefined;
  }

  markAsComplete() {
    if (this.parcel && this.parcel.originalStatus === 'delivered_to_recipient') {
      console.log('Attempting to mark parcel as complete:', {
        parcelId: this.parcel.id,
        trackingNumber: this.parcel.trackingNumber,
        currentStatus: this.parcel.originalStatus
      });
      
      // Show confirmation toast with details
      this.toastService.showInfo(
        `Confirming delivery completion for parcel ${this.parcel.trackingNumber}...`
      );
      
      // Call API to update parcel status to completed
      console.log('Making API call to markAsCompleted with:', {
        parcelId: this.parcel.id,
        data: {}
      });
      
      this.parcelsService.markAsCompleted(this.parcel.id, {}).subscribe({
        next: (response) => {
          console.log('✅ Parcel marked as completed - API response:', response);
          
          // Add safety check to prevent setting parcel to null
          if (response && response.id) {
            const mappedParcel = this.mapApiResponseToParcel(response);
            
            if (mappedParcel) {
              this.parcel = mappedParcel;
              
              // Ensure the status is updated to 'Completed' for frontend display
              this.parcel.status = 'Completed';
              console.log('Updated parcel status to Completed');
              
              // Add completion event to tracking timeline
              this.trackingEvents.push({
                id: (this.trackingEvents.length + 1).toString(),
                status: 'Completed',
                location: this.parcel.deliveryAddress,
                timestamp: this.formatDate(new Date()),
                description: 'Parcel delivery has been completed by customer',
                icon: 'fas fa-check-double'
              });
              
              this.toastService.showSuccess(
                `Delivery completed successfully! You can now leave a review for this delivery.`
              );
              
              // Show review prompt for newly completed parcels
              this.showReviewPrompt = true;
              
              // Scroll to review section
              setTimeout(() => {
                const reviewSection = document.querySelector('.review-section');
                if (reviewSection) {
                  reviewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 500);
            } else {
              console.error('❌ Failed to map API response to parcel');
              this.toastService.showError('Failed to process parcel data. Please try again.');
            }
          } else {
            console.error('❌ Invalid response from markAsCompleted API:', response);
            this.toastService.showError('Received invalid response from server. Please try again.');
          }
        },
        error: (error) => {
          console.error('❌ Error marking parcel as completed:', error);
          console.error('Error details:', {
            status: error.status,
            statusText: error.statusText,
            message: error.message,
            error: error.error
          });
          this.toastService.showError('Failed to mark parcel as completed. Please try again.');
        }
      });
      
    } else {
      console.error('Cannot mark as complete - conditions not met:', {
        hasParcel: !!this.parcel,
        originalStatus: this.parcel?.originalStatus,
        requiredStatus: 'delivered_to_recipient'
      });
      this.toastService.showError('Cannot mark parcel as complete at this time.');
    }
  }

  canMarkAsComplete(): boolean {
    // Only recipients can mark parcels as complete
    if (!this.parcel || !this.currentUser) return false;
    
    // Determine if current user is the recipient (cache the result)
    if (this.isRecipient === undefined || this.isSender === undefined) {
      this.isRecipient = this.parcel.receiverName === this.currentUser.name;
      this.isSender = this.parcel.senderName === this.currentUser.name;
    }
    
    const canComplete = this.parcel.originalStatus === 'delivered_to_recipient' && this.isRecipient;
    
    // Only log once per state change to avoid spam
    if (this.lastCanCompleteState !== canComplete) {
      console.log('canMarkAsComplete check:', {
        originalStatus: this.parcel.originalStatus,
        isRecipient: this.isRecipient,
        isSender: this.isSender,
        currentUser: this.currentUser.name,
        receiverName: this.parcel.receiverName,
        senderName: this.parcel.senderName,
        canComplete: canComplete
      });
      this.lastCanCompleteState = canComplete;
    }
    
    return canComplete;
  }

  canLeaveReview(): boolean {
    return this.parcel?.status === 'Completed';
  }

  shouldShowReviewSection(): boolean {
    // Show review section for both recipients and senders when parcel is completed
    if (!this.parcel || !this.currentUser) return false;
    
    // Use cached recipient/sender status to avoid repeated calculations
    if (this.isRecipient === undefined || this.isSender === undefined) {
      this.isRecipient = this.parcel.receiverName === this.currentUser.name;
      this.isSender = this.parcel.senderName === this.currentUser.name;
    }
    
    return (this.parcel.status === 'Completed' || this.showReviewPrompt) && (this.isRecipient || this.isSender);
  }

  generateTrackingEvents() {
    if (!this.parcel) return;

    this.trackingEvents = [];
    
    // Load status history from API
    this.parcelsService.getParcelHistory(this.parcelId).subscribe({
      next: (response: any) => {
        console.log('Status history from API:', response);
        if (response && response.length > 0) {
          this.trackingEvents = this.mapStatusHistoryToEvents(response);
        } else {
          // If no status history, generate events with real pickup date
          this.generateFallbackTrackingEvents();
        }
      },
      error: (error: any) => {
        console.error('Error loading status history:', error);
        // Fallback to generated events
        this.generateFallbackTrackingEvents();
      }
    });
  }

  private mapStatusHistoryToEvents(statusHistory: any[]): TrackingEvent[] {
    const events: TrackingEvent[] = [];
    
    statusHistory.forEach((status, index) => {
      // Use actual pickup time for picked_up status if available
      let timestamp: string;
      if (status.status.toLowerCase() === 'picked_up' && this.parcel?.scheduledPickup && this.parcel.scheduledPickup !== 'TBD') {
        timestamp = this.parcel.scheduledPickup;
      } else {
        // Use timestamp field from backend response (not createdAt)
        timestamp = this.formatDateTime(status.timestamp);
      }
      
      const event: TrackingEvent = {
        id: (index + 1).toString(),
        status: this.getStatusDisplayName(status.status),
        location: status.location || 'Unknown Location',
        timestamp: timestamp,
        description: status.notes || this.getStatusDescription(status.status),
        icon: this.getStatusIcon(status.status)
      };
      events.push(event);
    });

    // Reverse the events so that the most recent (like Completed) appears at the top
    return events.reverse();
  }

  private getStatusDisplayName(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Order Placed';
      case 'assigned':
        return 'Driver Assigned';
      case 'picked_up':
        return 'Picked Up';
      case 'in_transit':
        return 'In Transit';
      case 'delivered_to_recipient':
        return 'Out for Delivery';
      case 'delivered':
        return 'Delivered';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  private getStatusDescription(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'Order received';
      case 'in_transit': return 'En route to destination';
      case 'delivered_to_recipient': return 'Out for delivery';
      case 'delivered': return 'Successfully delivered';
      case 'completed': return 'Delivery completed';
      case 'cancelled': return 'Delivery cancelled';
      case 'picked_up': return 'Picked up from sender';
      case 'assigned': return 'Driver assigned';
      default: return 'Status updated';
    }
  }

  private getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'fas fa-clock';
      case 'in_transit': return 'fas fa-truck';
      case 'delivered_to_recipient': return 'fas fa-motorcycle';
      case 'delivered': return 'fas fa-check-circle';
      case 'completed': return 'fas fa-check-double';
      case 'cancelled': return 'fas fa-times-circle';
      case 'picked_up': return 'fas fa-box';
      case 'assigned': return 'fas fa-user-tie';
      default: return 'fas fa-question-circle';
    }
  }

  private generateFallbackTrackingEvents() {
    if (!this.parcel) return;

    this.trackingEvents = [];
    
    // Use a safe base date - either from expected delivery or current date
    let baseDate: Date;
    try {
      if (this.parcel.expectedDelivery && this.parcel.expectedDelivery !== 'TBD') {
        const parsedDate = new Date(this.parcel.expectedDelivery);
        if (!isNaN(parsedDate.getTime())) {
          baseDate = parsedDate;
        } else {
          baseDate = new Date();
        }
      } else {
        baseDate = new Date();
      }
    } catch (error) {
      baseDate = new Date();
    }
    
    // Add events in reverse chronological order (most recent first)
    // This way they will appear at the top of the timeline
    
    // Add driver assigned event if driver is available
    if (this.parcel.driver && this.parcel.driver.name) {
      this.trackingEvents.push({
        id: '2',
        status: 'Driver Assigned',
        location: 'Dispatch Center',
        timestamp: this.formatDate(new Date(baseDate.getTime() - 6 * 24 * 60 * 60 * 1000)),
        description: `Driver ${this.parcel.driver.name} has been assigned to your parcel`,
        icon: 'fas fa-user-tie'
      });
    }

    // Always add order placed event
    this.trackingEvents.push({
      id: '1',
      status: 'Order Placed',
      location: 'Anytown',
      timestamp: this.formatDate(new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000)),
      description: 'Parcel order has been placed and confirmed',
      icon: 'fas fa-shopping-cart'
    });

    // Add events based on current status (in reverse chronological order)
    switch (this.parcel.status) {
      case 'Pending':
        break;
        
      case 'In Transit':
        // Use actual pickup date if available, otherwise generate estimated date
        let pickupDate: Date;
        if (this.parcel.scheduledPickup && this.parcel.scheduledPickup !== 'TBD') {
          try {
            const parsedPickupDate = new Date(this.parcel.scheduledPickup);
            if (!isNaN(parsedPickupDate.getTime())) {
              pickupDate = parsedPickupDate;
            } else {
              pickupDate = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            }
          } catch (error) {
            pickupDate = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
          }
        } else {
          pickupDate = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
        }
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '4' : '3',
          status: 'In Transit',
          location: this.parcel.currentLocation || 'Distribution Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is in transit to destination',
          icon: 'fas fa-truck'
        });
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '3' : '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(pickupDate),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        break;
        
      case 'Out for Delivery':
        // Use actual pickup date if available, otherwise generate estimated date
        let pickupDateOutForDelivery: Date;
        if (this.parcel.scheduledPickup && this.parcel.scheduledPickup !== 'TBD') {
          try {
            const parsedPickupDate = new Date(this.parcel.scheduledPickup);
            if (!isNaN(parsedPickupDate.getTime())) {
              pickupDateOutForDelivery = parsedPickupDate;
            } else {
              pickupDateOutForDelivery = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            }
          } catch (error) {
            pickupDateOutForDelivery = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
          }
        } else {
          pickupDateOutForDelivery = new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000);
        }
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '6' : '5',
          status: 'Out for Delivery',
          location: 'Local Facility',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is out for delivery',
          icon: 'fas fa-motorcycle'
        });
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '5' : '4',
          status: 'In Transit',
          location: 'Distribution Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is in transit to destination',
          icon: 'fas fa-truck'
        });
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '4' : '3',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(pickupDateOutForDelivery),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        break;
        
      case 'Delivered':
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '6' : '5',
          status: 'Delivered',
          location: this.parcel.deliveryAddress,
          timestamp: this.formatDate(new Date(this.parcel.deliveredDate || baseDate)),
          description: 'Parcel has been successfully delivered',
          icon: 'fas fa-check-circle'
        });
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '5' : '4',
          status: 'Out for Delivery',
          location: 'Local Facility',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is out for delivery',
          icon: 'fas fa-motorcycle'
        });
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '4' : '3',
          status: 'In Transit',
          location: 'Distribution Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is in transit to destination',
          icon: 'fas fa-truck'
        });
        
        this.trackingEvents.push({
          id: this.parcel.driver && this.parcel.driver.name ? '3' : '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        break;
        
      case 'Completed':
        this.trackingEvents.push({
          id: '6',
          status: 'Completed',
          location: this.parcel.deliveryAddress,
          timestamp: this.formatDate(new Date(this.parcel.deliveredDate || baseDate)),
          description: 'Parcel delivery has been completed by customer',
          icon: 'fas fa-check-double'
        });
        
        this.trackingEvents.push({
          id: '5',
          status: 'Delivered',
          location: this.parcel.deliveryAddress,
          timestamp: this.formatDate(new Date(this.parcel.deliveredDate || baseDate)),
          description: 'Parcel has been successfully delivered',
          icon: 'fas fa-check-circle'
        });
        
        this.trackingEvents.push({
          id: '4',
          status: 'Out for Delivery',
          location: 'Local Facility',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is out for delivery',
          icon: 'fas fa-motorcycle'
        });
        
        this.trackingEvents.push({
          id: '3',
          status: 'In Transit',
          location: 'Distribution Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is in transit to destination',
          icon: 'fas fa-truck'
        });
        
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        break;
        
      case 'Cancelled':
        this.trackingEvents.push({
          id: '3',
          status: 'Cancelled',
          location: 'Service Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
          description: 'Parcel delivery has been cancelled',
          icon: 'fas fa-times-circle'
        });
        
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        break;
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  formatDateTime(dateTime: string | Date | null | undefined): string {
    if (!dateTime) return 'TBD';
    
    try {
      const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
      if (isNaN(date.getTime())) return 'TBD';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return 'TBD';
    }
  }

  calculateEstimatedTime(pickupTime: string | Date | null | undefined, deliveryTime: string | Date | null | undefined): string {
    // If we have both pickup and delivery times, calculate the difference
    if (pickupTime && deliveryTime) {
      try {
        const pickup = typeof pickupTime === 'string' ? new Date(pickupTime) : pickupTime;
        const delivery = typeof deliveryTime === 'string' ? new Date(deliveryTime) : deliveryTime;
        
        if (isNaN(pickup.getTime()) || isNaN(delivery.getTime())) {
          return this.calculateRealisticDeliveryTime();
        }
        
        const diffMs = delivery.getTime() - pickup.getTime();
        const diffHours = Math.round(diffMs / (1000 * 60 * 60));
        
        if (diffHours < 1) {
          const diffMinutes = Math.round(diffMs / (1000 * 60));
          return `${diffMinutes} minutes`;
        } else if (diffHours < 24) {
          return `${diffHours} hours`;
        } else {
          const diffDays = Math.round(diffHours / 24);
          return `${diffDays} days`;
        }
      } catch (error) {
        return this.calculateRealisticDeliveryTime();
      }
    }
    
    // Fallback to realistic calculation based on distance
    return this.calculateRealisticDeliveryTime();
  }

  /**
   * Calculate realistic delivery time based on distance between pickup and delivery locations
   */
  private calculateRealisticDeliveryTime(): string {
    if (this.mapMarkers.length >= 2) {
      const pickup = this.mapMarkers[0];
      const delivery = this.mapMarkers[1];
      
      if (pickup && delivery) {
        const distance = this.calculateDistance(pickup.lat, pickup.lng, delivery.lat, delivery.lng);
        
        // Calculate realistic delivery time based on distance
        let estimatedTimeMinutes: number;
        
        if (distance <= 5) {
          // Local delivery (within 5km): 15-30 minutes
          estimatedTimeMinutes = Math.max(15, Math.round(distance * 4));
        } else if (distance <= 15) {
          // City delivery (5-15km): 30-90 minutes
          estimatedTimeMinutes = Math.max(30, Math.round(distance * 3));
        } else if (distance <= 50) {
          // Regional delivery (15-50km): 1-3 hours
          estimatedTimeMinutes = Math.max(60, Math.round(distance * 2.5));
        } else {
          // Long distance (50km+): 3+ hours
          estimatedTimeMinutes = Math.max(180, Math.round(distance * 2));
        }
        
        // Add buffer time for pickup and delivery stops
        estimatedTimeMinutes += 10;
        
        if (estimatedTimeMinutes < 60) {
          return `${estimatedTimeMinutes} minutes`;
        } else if (estimatedTimeMinutes < 1440) { // less than 24 hours
          const hours = Math.round(estimatedTimeMinutes / 60);
          return `${hours} hours`;
        } else {
          const days = Math.round(estimatedTimeMinutes / 1440);
          return `${days} days`;
        }
      }
    }
    
    // Default fallback
    return 'TBD';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'In Transit': return 'status-transit';
      case 'Out for Delivery': return 'status-delivery';
      case 'Delivered': return 'status-delivered';
      case 'Completed': return 'status-completed';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getTrackingEventClass(event: TrackingEvent): string {
    switch (event.status) {
      case 'Order Placed': return 'event-placed';
      case 'Picked Up': return 'event-picked';
      case 'In Transit': return 'event-transit';
      case 'Out for Delivery': return 'event-delivery';
      case 'Delivered': return 'event-delivered';
      case 'Completed': return 'event-completed';
      case 'Cancelled': return 'event-cancelled';
      default: return '';
    }
  }

  openReviewModal() {
    this.isEditingReview = false;
    this.showReviewModal = true;
    this.reviewRating = 5;
    this.reviewComment = '';
  }

  openEditReviewModal() {
    this.isEditingReview = true;
    this.showReviewModal = true;
    if (this.userReview) {
      this.reviewRating = this.userReview.rating;
      this.reviewComment = this.userReview.comment;
    }
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.isEditingReview = false;
    this.reviewRating = 5;
    this.reviewComment = '';
  }

  submitReview() {
    if (this.reviewRating && this.reviewComment.trim() && this.parcel) {
      const createReviewDto: CreateReviewDto = {
        parcelId: this.parcel.id,
        rating: this.reviewRating,
        comment: this.reviewComment
      };

      this.reviewService.createReview(createReviewDto).subscribe({
        next: (response: ReviewResponseDto) => {
          // Update local review object
          this.userReview = {
            id: response.id,
            rating: response.rating,
            comment: response.comment,
            date: new Date(response.createdAt).toISOString().split('T')[0],
            userName: 'You'
          };
          
          this.hasUserReviewed = true;
          this.showReviewModal = false;
          this.reviewRating = 5;
          this.reviewComment = '';
          
          this.toastService.showSuccess('Review submitted successfully!');
        },
        error: (error) => {
          console.error('Error submitting review:', error);
          this.toastService.showError('Failed to submit review. Please try again.');
        }
      });
    }
  }

  updateReview() {
    if (this.reviewRating && this.reviewComment.trim() && this.userReview) {
      const updateReviewDto: UpdateReviewDto = {
        rating: this.reviewRating,
        comment: this.reviewComment
      };

      this.reviewService.updateReview(this.userReview.id, updateReviewDto).subscribe({
        next: (response: ReviewResponseDto) => {
          // Update local review object
          if (this.userReview) {
            this.userReview.rating = response.rating;
            this.userReview.comment = response.comment;
            this.userReview.date = new Date(response.updatedAt).toISOString().split('T')[0];
          }
          
          this.showReviewModal = false;
          this.isEditingReview = false;
          this.reviewRating = 5;
          this.reviewComment = '';
          
          this.toastService.showSuccess('Review updated successfully!');
        },
        error: (error) => {
          console.error('Error updating review:', error);
          this.toastService.showError('Failed to update review. Please try again.');
        }
      });
    }
  }

  deleteReview() {
    if (this.userReview) {
      this.reviewService.deleteReview(this.userReview.id).subscribe({
        next: () => {
          this.userReview = null;
          this.hasUserReviewed = false;
          this.showReviewModal = false;
          this.isEditingReview = false;
          this.reviewRating = 5;
          this.reviewComment = '';
          
          this.toastService.showSuccess('Review deleted successfully!');
        },
        error: (error) => {
          console.error('Error deleting review:', error);
          this.toastService.showError('Failed to delete review. Please try again.');
        }
      });
    }
  }

  dismissReviewPrompt() {
    this.showReviewPrompt = false;
  }

  getStarClass(rating: number, starIndex: number): string {
    return starIndex <= rating ? 'fas fa-star filled' : 'far fa-star';
  }

  goBack() {
    this.router.navigate(['/user-parcels']);
  }

  // Map-related methods
  private async setupMapMarkers(): Promise<void> {
    if (!this.parcel) return;

    try {
      this.mapMarkers = [];
      this.mapMarkerTypes = [];

      // Geocode pickup address
      const pickupResult = await this.mapService.geocodeAddress(this.parcel.pickupAddress);
      if (pickupResult.success && pickupResult.location) {
        this.mapMarkers.push({
          ...pickupResult.location,
          description: `<strong>Pickup Location</strong><br>${this.parcel.pickupAddress}`,
          address: this.parcel.pickupAddress
        });
        this.mapMarkerTypes.push(MapMarkerType.PICKUP);
      } else {
        console.warn('Failed to geocode pickup address:', this.parcel.pickupAddress);
      }

      // Geocode delivery address
      const deliveryResult = await this.mapService.geocodeAddress(this.parcel.deliveryAddress);
      if (deliveryResult.success && deliveryResult.location) {
        this.mapMarkers.push({
          ...deliveryResult.location,
          description: `<strong>Delivery Location</strong><br>${this.parcel.deliveryAddress}`,
          address: this.parcel.deliveryAddress
        });
        this.mapMarkerTypes.push(MapMarkerType.DELIVERY);
      } else {
        console.warn('Failed to geocode delivery address:', this.parcel.deliveryAddress);
      }

      // Add current location marker if parcel is in transit AND no driver is assigned
      if (this.parcel.status === 'In Transit' && this.parcel.currentLocation && !this.parcel.driver) {
        const currentResult = await this.mapService.geocodeAddress(this.parcel.currentLocation);
        if (currentResult.success && currentResult.location) {
          this.mapMarkers.push({
            ...currentResult.location,
            description: `<strong>Current Location</strong><br>${this.parcel.currentLocation}`,
            address: this.parcel.currentLocation
          });
          this.mapMarkerTypes.push(MapMarkerType.CURRENT);
        } else {
          console.warn('Failed to geocode current location:', this.parcel.currentLocation);
        }
      }

      // Add driver location marker if parcel has a driver assigned
      if (this.parcel.driver) {
        console.log('🔍 Driver data received:', this.parcel.driver);
        console.log('📍 Driver coordinates:', {
          currentLat: this.parcel.driver.currentLat,
          currentLng: this.parcel.driver.currentLng
        });
        
        let driverLocation: MapCoordinates;
        
        // Check if we have actual driver coordinates from the API
        if (this.parcel.driver.currentLat && this.parcel.driver.currentLng) {
          // Use actual driver coordinates from API
          driverLocation = {
            lat: this.parcel.driver.currentLat,
            lng: this.parcel.driver.currentLng
          };
          console.log('✅ Using actual driver coordinates:', driverLocation);
        } else if (this.parcel.currentLocation && this.parcel.currentLocation !== 'Pending pickup') {
          // Fallback: geocode current location for driver position
          console.log('⚠️ No driver coordinates, using geocoded current location for driver');
          const driverResult = await this.mapService.geocodeAddress(this.parcel.currentLocation);
          if (driverResult.success && driverResult.location) {
            driverLocation = driverResult.location;
          } else {
            // Fallback: place driver between pickup and delivery
            driverLocation = {
              lat: this.mapMarkers[0]?.lat ? (this.mapMarkers[0].lat + this.mapMarkers[1]?.lat) / 2 : -1.2921,
              lng: this.mapMarkers[0]?.lng ? (this.mapMarkers[0].lng + this.mapMarkers[1]?.lng) / 2 : 36.8219
            };
          }
        } else {
          // If no current location, place driver between pickup and delivery (not near pickup)
          console.log('⚠️ No driver coordinates or current location, placing driver between pickup and delivery');
          const pickupLat = this.mapMarkers[0]?.lat || -1.2921;
          const pickupLng = this.mapMarkers[0]?.lng || 36.8219;
          const deliveryLat = this.mapMarkers[1]?.lat || -1.2921;
          const deliveryLng = this.mapMarkers[1]?.lng || 36.8219;
          
          driverLocation = {
            lat: (pickupLat + deliveryLat) / 2,
            lng: (pickupLng + deliveryLng) / 2
          };
        }
        
        console.log('📍 Final driver location:', driverLocation);
        
        // Always add driver marker when driver is assigned
        this.mapMarkers.push({
          ...driverLocation,
          description: `<strong>Driver Location</strong><br>${this.parcel.driver.name} - ${this.parcel.driver.vehicleNumber}<br>${this.parcel.driver.phone ? `Phone: ${this.parcel.driver.phone}` : ''}`,
          address: `Driver: ${this.parcel.driver.name}`
        });
        this.mapMarkerTypes.push(MapMarkerType.DRIVER);
        
        console.log('✅ Driver marker added. Total markers:', this.mapMarkers.length);
        console.log('📍 Driver marker details:', {
          lat: driverLocation.lat,
          lng: driverLocation.lng,
          description: `Driver: ${this.parcel.driver.name}`,
          type: MapMarkerType.DRIVER
        });
        console.log('🎯 All marker types:', this.mapMarkerTypes);
        console.log('🎯 All markers:', this.mapMarkers.map((marker, index) => ({
          index,
          lat: marker.lat,
          lng: marker.lng,
          description: marker.description,
          type: this.mapMarkerTypes[index]
        })));
        
        // Show toast notification for driver location
        this.toastService.showInfo(`Driver ${this.parcel.driver.name} location added to map`);
      } else {
        console.log('❌ No driver assigned to parcel');
      }

      // Update map center to show all markers
      this.updateMapCenter();
      
      // Calculate route information for tracking details
      this.calculateRouteInfo();
      
      // Show success message if markers were loaded
      if (this.mapMarkers.length > 0) {
        console.log('Final map markers:', this.mapMarkers);
        console.log('Final marker types:', this.mapMarkerTypes);
        this.toastService.showSuccess(`Loaded ${this.mapMarkers.length} location(s) on map`);
      }
    } catch (error) {
      console.error('Error setting up map markers:', error);
      this.toastService.showError('Failed to load map markers');
    }
  }

  private updateMapCenter(): void {
    if (this.mapMarkers.length === 0) return;

    if (this.mapMarkers.length === 1) {
      // Single marker - center on it
      this.mapCenter = { lat: this.mapMarkers[0].lat, lng: this.mapMarkers[0].lng };
    } else {
      // Multiple markers - center between them
      const lats = this.mapMarkers.map(marker => marker.lat);
      const lngs = this.mapMarkers.map(marker => marker.lng);
      
      const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
      const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
      
      this.mapCenter = { lat: centerLat, lng: centerLng };
    }
  }

  toggleMapView(): void {
    this.showMapView = !this.showMapView;
  }

  onMapReady(map: L.Map): void {
    console.log('Map is ready for user parcel details');
    
    // Ensure map component is properly initialized
    if (this.mapComponent && this.mapComponent.isMapReady() && this.mapMarkers.length > 0) {
      // Small delay to ensure everything is properly rendered
      setTimeout(() => {
        if (this.mapComponent && this.mapComponent.isMapReady()) {
          this.mapComponent.fitToMarkersAlways();
        }
      }, 200);
    }
  }

  onMarkerClick(location: MapLocation): void {
    console.log('Marker clicked:', location);
    
    // Show toast notification with location details
    if (location.description) {
      // Extract the location type from the description
      const locationType = location.description.includes('Pickup') ? 'Pickup' : 
                          location.description.includes('Delivery') ? 'Delivery' : 
                          location.description.includes('Current') ? 'Current' : 'Location';
      
      this.toastService.showInfo(`${locationType} Location: ${location.address || 'Address not available'}`);
    }
  }

  onMapClick(coordinates: MapCoordinates): void {
    console.log('Map clicked at:', coordinates);
  }

  onMapError(error: MapError): void {
    console.error('Map error:', error);
  }

  onRouteUpdated(routeInfo: { distance: number; estimatedTime: number }): void {
    console.log('Route updated:', routeInfo);
    
    // Update route information for tracking details
    this.routeDistance = routeInfo.distance ? `${routeInfo.distance.toFixed(1)}` : '';
    this.routeDuration = routeInfo.estimatedTime ? `${Math.round(routeInfo.estimatedTime)} min` : '';
    
    // Update parcel's estimated time with realistic calculation
    if (this.parcel && routeInfo.estimatedTime) {
      const estimatedTimeMinutes = Math.round(routeInfo.estimatedTime);
      
      if (estimatedTimeMinutes < 60) {
        this.parcel.estimatedTime = `${estimatedTimeMinutes} minutes`;
      } else if (estimatedTimeMinutes < 1440) { // less than 24 hours
        const hours = Math.round(estimatedTimeMinutes / 60);
        this.parcel.estimatedTime = `${hours} hours`;
      } else {
        const days = Math.round(estimatedTimeMinutes / 1440);
        this.parcel.estimatedTime = `${days} days`;
      }
    }
  }

  /**
   * Calculate delivery progress percentage based on parcel status
   */
  getDeliveryProgress(): number {
    if (!this.parcel) return 0;
    
    switch (this.parcel.status) {
      case 'Pending':
        return 25;
      case 'In Transit':
        return 60;
      case 'Out for Delivery':
        return 80;
      case 'Delivered':
        return 90;
      case 'Completed':
        return 100;
      case 'Cancelled':
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Calculate route information when map markers are available
   */
  private calculateRouteInfo(): void {
    if (this.mapMarkers.length >= 2) {
      // Calculate distance between pickup and delivery
      const pickup = this.mapMarkers[0];
      const delivery = this.mapMarkers[1];
      
      if (pickup && delivery) {
        const distance = this.calculateDistance(pickup.lat, pickup.lng, delivery.lat, delivery.lng);
        this.routeDistance = `${distance.toFixed(1)}`;
        
        // Calculate realistic delivery time based on distance
        // For urban delivery, consider traffic, stops, and delivery time
        let estimatedTimeMinutes: number;
        
        if (distance <= 5) {
          // Local delivery (within 5km): 15-30 minutes
          estimatedTimeMinutes = Math.max(15, Math.round(distance * 4));
        } else if (distance <= 15) {
          // City delivery (5-15km): 30-90 minutes
          estimatedTimeMinutes = Math.max(30, Math.round(distance * 3));
        } else if (distance <= 50) {
          // Regional delivery (15-50km): 1-3 hours
          estimatedTimeMinutes = Math.max(60, Math.round(distance * 2.5));
        } else {
          // Long distance (50km+): 3+ hours
          estimatedTimeMinutes = Math.max(180, Math.round(distance * 2));
        }
        
        // Add buffer time for pickup and delivery stops
        estimatedTimeMinutes += 10;
        
        this.routeDuration = `${estimatedTimeMinutes} min`;
        
        // Update parcel's estimated time with realistic calculation
        if (this.parcel) {
          if (estimatedTimeMinutes < 60) {
            this.parcel.estimatedTime = `${estimatedTimeMinutes} minutes`;
          } else if (estimatedTimeMinutes < 1440) { // less than 24 hours
            const hours = Math.round(estimatedTimeMinutes / 60);
            this.parcel.estimatedTime = `${hours} hours`;
          } else {
            const days = Math.round(estimatedTimeMinutes / 1440);
            this.parcel.estimatedTime = `${days} days`;
          }
        }
      }
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  fitMapToMarkers(): void {
    console.log('fitMapToMarkers called - mapComponent:', !!this.mapComponent, 'markers count:', this.mapMarkers.length, 'showMapView:', this.showMapView);
    
    if (this.mapMarkers.length === 0) {
      console.warn('No markers available to fit');
      this.toastService.showWarning('No markers to fit');
      return;
    }
    
    // If map view is hidden, show it first
    if (!this.showMapView) {
      this.showMapView = true;
      console.log('Map view was hidden, showing it first');
      // Wait for the map component to be rendered
      setTimeout(() => {
        this.fitMapToMarkers();
      }, 200);
      return;
    }
    
    if (!this.mapComponent || !this.mapComponent.isMapReady()) {
      console.warn('Map component not ready, attempting to fit after delay');
      // Try again after a short delay in case the component is still initializing
      setTimeout(() => {
        if (this.mapComponent && this.mapComponent.isMapReady()) {
          this.mapComponent.forceMapRefresh();
          console.log('Fitting map to show all markers (delayed)');
          this.toastService.showInfo('Map adjusted to show all locations');
        } else {
          console.error('Map component still not ready after delay');
          this.toastService.showError('Map component not ready');
        }
      }, 100);
      return;
    }
    
    // Force map refresh and then fit to markers
    this.mapComponent.forceMapRefresh();
    console.log('Fitting map to show all markers');
    this.toastService.showInfo('Map adjusted to show all locations');
  }

  refreshMapMarkers(): void {
    console.log('refreshMapMarkers called - mapComponent:', !!this.mapComponent, 'markers count:', this.mapMarkers.length, 'showMapView:', this.showMapView);
    
    // If map view is hidden, show it first
    if (!this.showMapView) {
      this.showMapView = true;
      console.log('Map view was hidden, showing it first');
      // Wait for the map component to be rendered
      setTimeout(() => {
        this.refreshMapMarkers();
      }, 200);
      return;
    }
    
    // First, refresh the map component to ensure it's properly rendered
    if (this.mapComponent && this.mapComponent.isMapReady()) {
      this.mapComponent.forceMapRefresh();
    }
    
    // Then refresh markers
    this.setupMapMarkers();
    
    // Finally, fit to markers after everything is loaded
    setTimeout(() => {
      if (this.mapComponent && this.mapComponent.isMapReady() && this.mapMarkers.length > 0) {
        this.mapComponent.fitToMarkersAlways();
      } else if (!this.mapComponent || !this.mapComponent.isMapReady()) {
        console.warn('Map component not ready during refresh, trying again...');
        // Try again after another delay
        setTimeout(() => {
          if (this.mapComponent && this.mapComponent.isMapReady() && this.mapMarkers.length > 0) {
            this.mapComponent.fitToMarkersAlways();
          }
        }, 300);
      }
    }, 500);
    
    this.toastService.showSuccess('Map markers refreshed!');
  }

  updateDriverLocationOnMap(driverLocation: DriverLocation): void {
    // Allow updates even when tracking is not enabled (for testing)
    if (!this.isDriverTrackingEnabled && !driverLocation.driverId?.includes('test')) {
      console.log('⚠️ Driver tracking not enabled, skipping update');
      return;
    }
    
    if (this.parcel?.driver && this.parcel.driver.name === driverLocation.driverName) {
      console.log('✅ Updating driver location for our parcel:', driverLocation);
      
      const existingDriverMarker = this.mapMarkers.find(
        (marker) => marker.description?.includes('Driver Location')
      );

      if (existingDriverMarker) {
        // Update the existing marker's position
        existingDriverMarker.lat = driverLocation.currentLat;
        existingDriverMarker.lng = driverLocation.currentLng;
        existingDriverMarker.description = `<strong>Driver Location</strong><br>${driverLocation.driverName} - ${driverLocation.vehicleNumber || 'N/A'}<br>Last Updated: ${new Date().toLocaleTimeString()}`;
        
        // Update the marker on the map
        this.mapComponent?.updateMarker(existingDriverMarker);
        
        console.log('✅ Driver marker updated on map');
      } else {
        // Add a new driver marker if it doesn't exist
        const newDriverMarker: MapLocation = {
          lat: driverLocation.currentLat,
          lng: driverLocation.currentLng,
          description: `<strong>Driver Location</strong><br>${driverLocation.driverName} - ${driverLocation.vehicleNumber || 'N/A'}<br>Last Updated: ${new Date().toLocaleTimeString()}`,
          address: `Driver: ${driverLocation.driverName}`
        };
        
        this.mapMarkers.push(newDriverMarker);
        this.mapMarkerTypes.push(MapMarkerType.DRIVER);
        this.mapComponent?.addMarker(newDriverMarker);
        
        console.log('✅ New driver marker added to map');
      }
      
      this.updateMapCenter();
      this.toastService.showInfo(`Driver ${driverLocation.driverName} location updated`);
    } else {
      console.log('⚠️ Driver location update not for our parcel:', driverLocation.driverName);
    }
  }

  // Direct method to update driver marker with GPS coordinates
  updateDriverMarkerWithGPS(lat: number, lng: number): void {
    if (!this.parcel?.driver) {
      console.log('⚠️ No driver assigned to this parcel');
      return;
    }

    console.log('🎯 Directly updating driver marker with GPS coordinates:', { lat, lng });
    
    // Find existing driver marker by checking both description and type
    const driverMarkerIndex = this.mapMarkers.findIndex(
      (marker, index) => 
        marker.description?.includes('Driver Location') || 
        this.mapMarkerTypes[index] === MapMarkerType.DRIVER
    );

    if (driverMarkerIndex !== -1) {
      // Update existing driver marker
      this.mapMarkers[driverMarkerIndex].lat = lat;
      this.mapMarkers[driverMarkerIndex].lng = lng;
      this.mapMarkers[driverMarkerIndex].description = `<strong>Driver Location (GPS)</strong><br>${this.parcel.driver.name} - ${this.parcel.driver.vehicleNumber}<br>Last Updated: ${new Date().toLocaleTimeString()}`;
      
      // Force map component to refresh all markers
      this.mapComponent?.forceMapRefresh();
      
      console.log('✅ Driver marker updated with GPS coordinates');
      this.toastService.showSuccess('Driver marker updated with GPS location');
    } else {
      // Add new driver marker
      const newDriverMarker: MapLocation = {
        lat: lat,
        lng: lng,
        description: `<strong>Driver Location (GPS)</strong><br>${this.parcel.driver.name} - ${this.parcel.driver.vehicleNumber}<br>Last Updated: ${new Date().toLocaleTimeString()}`,
        address: `Driver: ${this.parcel.driver.name}`
      };
      
      this.mapMarkers.push(newDriverMarker);
      this.mapMarkerTypes.push(MapMarkerType.DRIVER);
      this.mapComponent?.addMarker(newDriverMarker);
      
      console.log('✅ New driver marker added with GPS coordinates');
      this.toastService.showSuccess('Driver marker added with GPS location');
    }
    
    // Update map center to show the new location
    this.updateMapCenter();
    
    // Force fit to markers to ensure the new location is visible
    setTimeout(() => {
      this.mapComponent?.fitToMarkers();
    }, 100);
  }
} 