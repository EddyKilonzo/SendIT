import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../../shared/map/map.component';
import { MapService } from '../../../services/map.service';
import { MapLocation, MapCoordinates, MapError, MapMarkerType } from '../../../types/map.types';
import { ToastService } from '../../shared/toast/toast.service';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ParcelsService } from '../../../services/parcels.service';
import * as L from 'leaflet';

interface Parcel {
  id: string;
  weight: number;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Completed' | 'Cancelled';
  pickupAddress: string;
  deliveryAddress: string;
  expectedDelivery?: string;
  deliveredDate?: string;
  scheduledPickup?: string;
  type?: 'sent' | 'received';
  description?: string;
  senderName?: string;
  receiverName?: string;
  trackingNumber?: string;
  currentLocation?: string;
  estimatedTime?: string;
  driver?: {
    name: string;
    vehicleNumber: string;
    phone?: string;
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
export class ParcelDetails implements OnInit {
  @ViewChild('mapComponent', { static: false }) mapComponent!: MapComponent;
  
  parcelId: string = '';
  parcel: Parcel | null = null;
  showReviewModal = false;
  
  reviewRating = 5;
  reviewComment = '';
  hasUserReviewed = false;
  userReview: Review | null = null;
  isEditingReview = false;
  
  // User role for role-based access control
  userRole: string = 'CUSTOMER'; // Default role, will be set from auth service later
  
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
        phone: '+254-700-123-456'
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapService,
    private toastService: ToastService,
    private parcelsService: ParcelsService
  ) {}

  ngOnInit() {
    this.parcelId = this.route.snapshot.params['id'];
    this.loadParcelDetails();
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
        this.parcel = this.mapApiResponseToParcel(response);
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

  private mapApiResponseToParcel(apiResponse: any): Parcel {
    return {
      id: apiResponse.id,
      weight: apiResponse.weight,
      status: this.mapStatus(apiResponse.status),
      pickupAddress: apiResponse.pickupAddress,
      deliveryAddress: apiResponse.deliveryAddress,
      expectedDelivery: apiResponse.estimatedDeliveryTime || 'TBD',
      deliveredDate: apiResponse.actualDeliveryTime,
      scheduledPickup: apiResponse.estimatedPickupTime,
      type: 'sent', // Default to sent for now
      description: apiResponse.description,
      senderName: apiResponse.senderName,
      receiverName: apiResponse.recipientName,
      trackingNumber: apiResponse.trackingNumber,
      currentLocation: apiResponse.currentLocation,
      estimatedTime: apiResponse.estimatedDeliveryTime ? `${apiResponse.estimatedDeliveryTime} hours` : 'TBD',
      driver: apiResponse.driver ? {
        name: apiResponse.driver.name,
        vehicleNumber: apiResponse.driver.vehicleNumber,
        phone: apiResponse.driver.phone
      } : undefined
    };
  }

  private mapStatus(apiStatus: string): 'Pending' | 'In Transit' | 'Delivered' | 'Completed' | 'Cancelled' {
    switch (apiStatus.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'assigned':
      case 'picked_up':
        return 'Pending';
      case 'in_transit':
        return 'In Transit';
      case 'delivered_to_recipient':
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
  }

  markAsComplete() {
    if (this.parcel && this.parcel.status === 'Delivered') {
      this.parcel.status = 'Completed';
      
      // Add completion event to tracking timeline
      this.trackingEvents.push({
        id: (this.trackingEvents.length + 1).toString(),
        status: 'Completed',
        location: this.parcel.deliveryAddress,
        timestamp: this.formatDate(new Date()),
        description: 'Parcel delivery has been completed by customer',
        icon: 'fas fa-check-double'
      });
      
      this.toastService.showSuccess('Parcel marked as completed! You can now leave a review.');
      
      // Call API to update parcel status to completed
      this.parcelsService.markAsCompleted(this.parcel.id, {}).subscribe({
        next: (response) => {
          console.log('Parcel marked as completed:', response);
          this.parcel = this.mapApiResponseToParcel(response);
        },
        error: (error) => {
          console.error('Error marking parcel as completed:', error);
          this.toastService.showError('Failed to mark parcel as completed');
          // Revert the status change on error
          if (this.parcel) {
            this.parcel.status = 'Delivered';
          }
          this.trackingEvents.pop(); // Remove the completion event
        }
      });
    }
  }

  canMarkAsComplete(): boolean {
    return this.parcel?.status === 'Delivered';
  }

  canLeaveReview(): boolean {
    return this.parcel?.status === 'Completed';
  }

  generateTrackingEvents() {
    if (!this.parcel) return;

    this.trackingEvents = [];
    
    // Load status history from API
    this.parcelsService.getParcelHistory(this.parcelId).subscribe({
      next: (response: any) => {
        console.log('Status history from API:', response);
        this.trackingEvents = this.mapStatusHistoryToEvents(response);
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
      const event: TrackingEvent = {
        id: (index + 1).toString(),
        status: this.getStatusDisplayName(status.status),
        location: status.location || 'Unknown Location',
        timestamp: this.formatDate(new Date(status.createdAt)),
        description: status.notes || this.getStatusDescription(status.status),
        icon: this.getStatusIcon(status.status)
      };
      events.push(event);
    });

    return events;
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
    switch (status) {
      case 'Pending': return 'Parcel is pending pickup';
      case 'In Transit': return 'Parcel is in transit to destination';
      case 'Delivered': return 'Parcel has been successfully delivered';
      case 'Completed': return 'Parcel delivery has been completed';
      case 'Cancelled': return 'Parcel delivery has been cancelled';
      default: return 'Unknown status';
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'Pending': return 'fas fa-clock';
      case 'In Transit': return 'fas fa-truck';
      case 'Delivered': return 'fas fa-check-circle';
      case 'Completed': return 'fas fa-check-double';
      case 'Cancelled': return 'fas fa-times-circle';
      default: return 'fas fa-question-circle';
    }
  }

  private generateFallbackTrackingEvents() {
    if (!this.parcel) return;

    this.trackingEvents = [];
    const baseDate = new Date(this.parcel.expectedDelivery || new Date());
    
    // Always add order placed event
    this.trackingEvents.push({
      id: '1',
      status: 'Order Placed',
      location: 'Anytown',
      timestamp: this.formatDate(new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000)),
      description: 'Parcel order has been placed and confirmed',
      icon: 'fas fa-shopping-cart'
    });

    // Add events based on current status
    switch (this.parcel.status) {
      case 'Pending':
        break;
        
      case 'In Transit':
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        
        this.trackingEvents.push({
          id: '3',
          status: 'In Transit',
          location: this.parcel.currentLocation || 'Distribution Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is in transit to destination',
          icon: 'fas fa-truck'
        });
        break;
        
      case 'Delivered':
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
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
          id: '4',
          status: 'Out for Delivery',
          location: 'Local Facility',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is out for delivery',
          icon: 'fas fa-motorcycle'
        });
        
        this.trackingEvents.push({
          id: '5',
          status: 'Delivered',
          location: this.parcel.deliveryAddress,
          timestamp: this.formatDate(new Date(this.parcel.deliveredDate || baseDate)),
          description: 'Parcel has been successfully delivered',
          icon: 'fas fa-check-circle'
        });
        break;
        
      case 'Completed':
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
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
          id: '4',
          status: 'Out for Delivery',
          location: 'Local Facility',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is out for delivery',
          icon: 'fas fa-motorcycle'
        });
        
        this.trackingEvents.push({
          id: '5',
          status: 'Delivered',
          location: this.parcel.deliveryAddress,
          timestamp: this.formatDate(new Date(this.parcel.deliveredDate || baseDate)),
          description: 'Parcel has been successfully delivered',
          icon: 'fas fa-check-circle'
        });
        break;
        
      case 'Cancelled':
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        
        this.trackingEvents.push({
          id: '3',
          status: 'Cancelled',
          location: 'Service Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
          description: 'Parcel delivery has been cancelled',
          icon: 'fas fa-times-circle'
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

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'In Transit': return 'status-transit';
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
    if (this.reviewRating && this.reviewComment.trim()) {
      const newReview: Review = {
        id: Date.now().toString(),
        rating: this.reviewRating,
        comment: this.reviewComment,
        date: new Date().toISOString().split('T')[0],
        userName: 'You'
      };
      
      this.userReview = newReview;
      this.hasUserReviewed = true;
      this.showReviewModal = false;
      this.reviewRating = 5;
      this.reviewComment = '';
      
      this.toastService.showSuccess('Review submitted successfully!');
    }
  }

  updateReview() {
    if (this.reviewRating && this.reviewComment.trim() && this.userReview) {
      this.userReview.rating = this.reviewRating;
      this.userReview.comment = this.reviewComment;
      this.userReview.date = new Date().toISOString().split('T')[0]; // Update date to current date
      
      this.showReviewModal = false;
      this.isEditingReview = false;
      this.reviewRating = 5;
      this.reviewComment = '';
      
      this.toastService.showSuccess('Review updated successfully!');
    }
  }

  deleteReview() {
    this.userReview = null;
    this.hasUserReviewed = false;
    this.showReviewModal = false;
    this.isEditingReview = false;
    this.reviewRating = 5;
    this.reviewComment = '';
    
    this.toastService.showSuccess('Review deleted successfully!');
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

      // Add current location marker if parcel is in transit
      if (this.parcel.status === 'In Transit' && this.parcel.currentLocation) {
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
      if (this.parcel.status === 'In Transit' && this.parcel.driver) {
        // For demo purposes, we'll add a marker near the pickup location
        const driverLocation = {
          lat: this.mapMarkers[0]?.lat ? this.mapMarkers[0].lat + 0.01 : -1.2921,
          lng: this.mapMarkers[0]?.lng ? this.mapMarkers[0].lng + 0.01 : 36.8219
        };
        
        this.mapMarkers.push({
          ...driverLocation,
          description: `<strong>Driver Location</strong><br>${this.parcel.driver.name} - ${this.parcel.driver.vehicleNumber}`,
          address: `Driver: ${this.parcel.driver.name}`
        });
        this.mapMarkerTypes.push(MapMarkerType.DRIVER);
      }

      // Update map center to show all markers
      this.updateMapCenter();
      
      // Show success message if markers were loaded
      if (this.mapMarkers.length > 0) {
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
} 