import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../../shared/map/map.component';
import { MapService } from '../../../services/map.service';
import { MapLocation, MapCoordinates, MapError, MapMarkerType } from '../../../types/map.types';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ParcelsService, Parcel } from '../../../services/parcels.service';
import { ToastService } from '../../shared/toast/toast.service';
import * as L from 'leaflet';

interface DeliveryInstruction {
  text: string;
  completed: boolean;
  completedAt?: Date;
  location?: string;
}

interface StatusHistoryItem {
  status: string;
  timestamp: Date;
  notes?: string;
  location?: string;
  completed: boolean;
}

interface RouteInfo {
  distance: number;
  estimatedTime: number;
  optimized: boolean;
}

@Component({
  selector: 'app-driver-parcel-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MapComponent, SidebarComponent],
  templateUrl: './parcel-details.html',
  styleUrls: ['./parcel-details.css']
})
export class DriverParcelDetails implements OnInit {
  @ViewChild('mapComponent', { static: false }) mapComponent!: MapComponent;
  
  parcel: Parcel | null = null;
  deliveryInstructions: DeliveryInstruction[] = [];
  statusHistory: StatusHistoryItem[] = [];

  userRole: string = 'DRIVER';
  showMapView: boolean = false;
  isLoading: boolean = false;
  isCalculatingRoute: boolean = false;
  isSettingUpMap: boolean = false;
  isUpdatingStatus: boolean = false; // Add loading state for status updates
  
  // Map-related properties
  mapMarkers: MapLocation[] = [];
  mapCenter: MapCoordinates = { lat: -1.2921, lng: 36.8219 }; // Nairobi
  currentLocation: MapLocation | null = null;
  mapMarkerTypes: MapMarkerType[] = [];
  routeInfo: RouteInfo = { distance: 0, estimatedTime: 0, optimized: false };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private mapService: MapService,
    private parcelsService: ParcelsService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    // Get parcel ID from route parameters
    this.route.params.subscribe(params => {
      const parcelId = params['id'];
      this.loadParcelDetails(parcelId);
    });
  }

  loadParcelDetails(parcelId: string) {
    this.isLoading = true;
    const startTime = performance.now();
    
    console.log('🚀 Starting to load parcel details for ID:', parcelId);
    
    this.parcelsService.getParcel(parcelId).subscribe({
      next: async (parcel) => {
        const parcelLoadTime = performance.now() - startTime;
        console.log(`✅ Parcel loaded in ${parcelLoadTime.toFixed(2)}ms`);
        
        this.parcel = parcel;
        
        // Initialize basic data immediately
        this.initializeDeliveryInstructions();
        
        // Load all data in parallel instead of sequentially
        const parallelStartTime = performance.now();
        try {
          await Promise.all([
            this.loadStatusHistory(parcelId),
            this.setupMapMarkers(),
            this.calculateRouteInfo()
          ]);
          
          const parallelLoadTime = performance.now() - parallelStartTime;
          console.log(`✅ Parallel operations completed in ${parallelLoadTime.toFixed(2)}ms`);
        } catch (error) {
          console.error('Error loading parallel data:', error);
          // Continue even if some operations fail
        }
        
        const totalTime = performance.now() - startTime;
        console.log(`🎉 Total parcel details load time: ${totalTime.toFixed(2)}ms`);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading parcel details:', error);
        this.toastService.showError('Failed to load parcel details');
        this.isLoading = false;
      }
    });
  }

  private loadStatusHistory(parcelId: string): Promise<void> {
    return new Promise((resolve) => {
      this.parcelsService.getParcelHistory(parcelId).subscribe({
        next: (history: any[]) => {
          this.statusHistory = history.map((item: any) => ({
            status: item.status,
            timestamp: new Date(item.timestamp),
            notes: item.notes,
            location: item.location,
            completed: true
          }));
          resolve();
        },
        error: (error: any) => {
          console.error('Error loading status history:', error);
          resolve(); // Resolve even on error to not block other operations
        }
      });
    });
  }

  private initializeDeliveryInstructions(): void {
    if (!this.parcel) return;

    // Determine completion status based on current parcel status
    const isPickupCompleted = this.parcel.status === 'picked_up' || 
                             this.parcel.status === 'in_transit' || 
                             this.parcel.status === 'delivered_to_recipient' ||
                             this.parcel.status === 'delivered' ||
                             this.parcel.status === 'completed';

    const isDeliveryCompleted = this.parcel.status === 'delivered_to_recipient' ||
                               this.parcel.status === 'delivered' ||
                               this.parcel.status === 'completed';

    this.deliveryInstructions = [
      {
        text: `Pick up from: ${this.parcel.pickupAddress}`,
        completed: isPickupCompleted,
        completedAt: isPickupCompleted ? new Date() : undefined,
        location: this.parcel.pickupAddress
      },
      {
        text: `Deliver to: ${this.parcel.deliveryAddress}`,
        completed: isDeliveryCompleted,
        completedAt: isDeliveryCompleted ? new Date() : undefined,
        location: this.parcel.deliveryAddress
      }
    ];

    console.log('Initialized delivery instructions:', {
      status: this.parcel.status,
      pickupCompleted: isPickupCompleted,
      deliveryCompleted: isDeliveryCompleted
    });
  }

  private async setupMapMarkers(): Promise<void> {
    if (!this.parcel) return;

    this.isSettingUpMap = true;
    try {
      this.mapMarkers = [];
      this.mapMarkerTypes = [];

      // Add current location marker (driver's location)
      // Using a default location for now - in real app, this would get actual driver location
      this.currentLocation = {
        lat: -1.2921,
        lng: 36.8219,
        description: 'Your Current Location',
        address: 'Current Location'
      };
      this.mapMarkers.push({
        ...this.currentLocation,
        description: `<strong>Your Current Location</strong><br>Driver Position<br><strong>Parcel ID:</strong> ${this.parcel.trackingNumber}`,
        address: 'Current Location'
      });
      this.mapMarkerTypes.push(MapMarkerType.CURRENT);

      // Geocode pickup and delivery addresses in parallel
      const [pickupResult, deliveryResult] = await Promise.all([
        this.mapService.geocodeAddress(this.parcel.pickupAddress),
        this.mapService.geocodeAddress(this.parcel.deliveryAddress)
      ]);

      // Add pickup location marker
      let pickupLocation: MapLocation | null = null;
      if (pickupResult.success && pickupResult.location) {
        pickupLocation = pickupResult.location;
      } else {
        // Fallback coordinates for pickup (Nairobi area)
        pickupLocation = {
          lat: -1.2921,
          lng: 36.8219,
          address: this.parcel.pickupAddress,
          description: `Pickup Location (approximate)`
        };
        console.warn('Geocoding failed for pickup address, using fallback coordinates');
      }

      if (pickupLocation) {
        this.mapMarkers.push({
          ...pickupLocation,
          description: `<strong>Pickup Location</strong><br>${this.parcel.pickupAddress}<br><strong>Sender:</strong> ${this.parcel.senderName}<br><strong>Phone:</strong> ${this.parcel.senderPhone}`,
          address: this.parcel.pickupAddress
        });
        this.mapMarkerTypes.push(MapMarkerType.PICKUP);
      }

      // Add delivery location marker
      let deliveryLocation: MapLocation | null = null;
      if (deliveryResult.success && deliveryResult.location) {
        deliveryLocation = deliveryResult.location;
      } else {
        // Fallback coordinates for delivery (slightly different from pickup)
        deliveryLocation = {
          lat: -1.2841,
          lng: 36.8155,
          address: this.parcel.deliveryAddress,
          description: `Delivery Location (approximate)`
        };
        console.warn('Geocoding failed for delivery address, using fallback coordinates');
      }

      if (deliveryLocation) {
        this.mapMarkers.push({
          ...deliveryLocation,
          description: `<strong>Delivery Location</strong><br>${this.parcel.deliveryAddress}<br><strong>Recipient:</strong> ${this.parcel.recipientName}<br><strong>Phone:</strong> ${this.parcel.recipientPhone}<br><strong>Instructions:</strong> ${this.parcel.deliveryInstructions || 'No special instructions'}`,
          address: this.parcel.deliveryAddress
        });
        this.mapMarkerTypes.push(MapMarkerType.DELIVERY);
      }

      // Update map center to show all markers
      this.updateMapCenter();
      
      console.log(`Loaded ${this.mapMarkers.length} markers for driver parcel details:`, this.mapMarkers);
    } catch (error) {
      console.error('Error setting up map markers:', error);
      // Even if there's an error, try to show at least the current location
      if (this.mapMarkers.length === 0) {
        this.mapMarkers.push({
          lat: -1.2921,
          lng: 36.8219,
          description: `<strong>Your Current Location</strong><br>Driver Position<br><strong>Parcel ID:</strong> ${this.parcel.trackingNumber}`,
          address: 'Current Location'
        });
        this.mapMarkerTypes.push(MapMarkerType.CURRENT);
      }
    } finally {
      this.isSettingUpMap = false;
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

  private async calculateRouteInfo(): Promise<void> {
    if (!this.parcel) return;

    this.isCalculatingRoute = true;

    try {
      // Use existing map markers if available, otherwise geocode addresses
      let pickupCoords: MapCoordinates | null = null;
      let deliveryCoords: MapCoordinates | null = null;

      // Check if we already have geocoded coordinates from map markers
      const pickupMarker = this.mapMarkers.find(m => m.address === this.parcel?.pickupAddress);
      const deliveryMarker = this.mapMarkers.find(m => m.address === this.parcel?.deliveryAddress);

      if (pickupMarker && deliveryMarker) {
        // Use existing coordinates from map markers
        pickupCoords = { lat: pickupMarker.lat, lng: pickupMarker.lng };
        deliveryCoords = { lat: deliveryMarker.lat, lng: deliveryMarker.lng };
      } else {
        // Fallback: geocode addresses if markers aren't available yet
        const [pickupResult, deliveryResult] = await Promise.all([
          this.mapService.geocodeAddress(this.parcel.pickupAddress),
          this.mapService.geocodeAddress(this.parcel.deliveryAddress)
        ]);

        if (pickupResult.success && pickupResult.location) {
          pickupCoords = { lat: pickupResult.location.lat, lng: pickupResult.location.lng };
        }
        if (deliveryResult.success && deliveryResult.location) {
          deliveryCoords = { lat: deliveryResult.location.lat, lng: deliveryResult.location.lng };
        }
      }

      if (pickupCoords && deliveryCoords) {
        const waypoints: MapCoordinates[] = [pickupCoords, deliveryCoords];

        // Use the map service to calculate accurate route info
        const routeInfo = this.mapService.calculateRouteInfo(waypoints);
        
        // Round distance to 2 decimal places for better accuracy
        const roundedDistance = Math.round(routeInfo.distance * 100) / 100;
        
        this.routeInfo = {
          distance: roundedDistance,
          estimatedTime: routeInfo.estimatedTime,
          optimized: false
        };

        console.log('Route calculated:', {
          pickup: this.parcel.pickupAddress,
          delivery: this.parcel.deliveryAddress,
          distance: routeInfo.distance,
          estimatedTime: routeInfo.estimatedTime
        });
      } else {
        console.warn('Failed to get coordinates for route calculation');
        // Fallback to basic calculation if geocoding fails
        this.calculateBasicRouteInfo();
      }
    } catch (error) {
      console.error('Error calculating route info:', error);
      // Fallback to basic calculation
      this.calculateBasicRouteInfo();
    } finally {
      this.isCalculatingRoute = false;
    }
  }

  private calculateBasicRouteInfo(): void {
    if (this.mapMarkers.length >= 2) {
      // Calculate distance between pickup and delivery
      const pickup = this.mapMarkers.find(m => m.address === this.parcel?.pickupAddress);
      const delivery = this.mapMarkers.find(m => m.address === this.parcel?.deliveryAddress);
      
      if (pickup && delivery) {
        // Use Haversine formula for more accurate distance calculation
        const distance = this.mapService.calculateDistance(
          { lat: pickup.lat, lng: pickup.lng },
          { lat: delivery.lat, lng: delivery.lng }
        );
        
        // Round to 2 decimal places for better accuracy
        const roundedDistance = Math.round(distance * 100) / 100;
        
        this.routeInfo = {
          distance: roundedDistance,
          estimatedTime: Math.round((roundedDistance / 30) * 60), // 30 km/h average speed
          optimized: false
        };
        
        console.log('Calculated route distance:', {
          pickup: this.parcel?.pickupAddress,
          delivery: this.parcel?.deliveryAddress,
          distance: roundedDistance,
          estimatedTime: this.routeInfo.estimatedTime
        });
      } else {
        // If no markers found, use a fallback calculation based on addresses
        this.calculateFallbackDistance();
      }
    } else {
      // If not enough markers, use fallback calculation
      this.calculateFallbackDistance();
    }
  }

  private calculateFallbackDistance(): void {
    if (!this.parcel) return;
    
    // Use a simple estimation based on address similarity
    // This is a fallback when geocoding fails
    const estimatedDistance = this.estimateDistanceFromAddresses(
      this.parcel.pickupAddress,
      this.parcel.deliveryAddress
    );
    
    this.routeInfo = {
      distance: estimatedDistance,
      estimatedTime: Math.round((estimatedDistance / 25) * 60), // 25 km/h average speed
      optimized: false
    };
  }

  private estimateDistanceFromAddresses(pickupAddress: string, deliveryAddress: string): number {
    // Simple estimation based on address analysis
    // This is a fallback method when geocoding is not available
    
    // Check if addresses are in same city/area
    const pickupCity = this.extractCity(pickupAddress);
    const deliveryCity = this.extractCity(deliveryAddress);
    
    if (pickupCity === deliveryCity) {
      // Same city - estimate 5-15 km
      return Math.random() * 10 + 5;
    } else {
      // Different cities - estimate 20-50 km
      return Math.random() * 30 + 20;
    }
  }

  private extractCity(address: string): string {
    // Extract city from address (simple implementation)
    const parts = address.split(',').map(part => part.trim());
    if (parts.length >= 2) {
      return parts[parts.length - 2]; // Usually city is second to last
    }
    return address;
  }

  toggleInstruction(index: number) {
    if (!this.canCompleteInstruction(index)) {
      return;
    }

    this.deliveryInstructions[index].completed = !this.deliveryInstructions[index].completed;
    
    if (this.deliveryInstructions[index].completed) {
      this.deliveryInstructions[index].completedAt = new Date();
      this.deliveryInstructions[index].location = this.getLocationForInstruction(index);
    }
    
    // Update status based on completed instructions
    this.updateParcelStatus();
  }

  canCompleteInstruction(index: number): boolean {
    // Can only complete instructions in order
    for (let i = 0; i < index; i++) {
      if (!this.deliveryInstructions[i].completed) {
        return false;
      }
    }
    return true;
  }

  updateParcelStatus() {
    if (!this.parcel) return;

    const completedCount = this.deliveryInstructions.filter(instruction => instruction.completed).length;
    
    let newStatus = this.parcel.status;
    
    if (completedCount === 0) {
      newStatus = 'assigned';
    } else if (completedCount === 1) {
      // After pickup, status changes to picked_up
      newStatus = 'picked_up';
    } else if (completedCount === 2) {
      // After delivery, status changes to delivered_to_recipient (waiting for customer confirmation)
      newStatus = 'delivered_to_recipient';
    }

    if (newStatus !== this.parcel.status) {
      this.updateParcelStatusOnServer(newStatus);
    }
  }

  private updateParcelStatusOnServer(newStatus: string) {
    if (!this.parcel) return;

    this.isUpdatingStatus = true; // Set loading state

    // Determine the appropriate status update based on the new status
    let statusUpdate: any = {
      status: newStatus as any,
      notes: `Status updated by driver to ${newStatus}`
    };

    // Add specific notes based on the action
    if (newStatus === 'picked_up') {
      statusUpdate.notes = 'Parcel picked up from sender';
      statusUpdate.currentLocation = this.parcel.pickupAddress;
    } else if (newStatus === 'delivered_to_recipient') {
      statusUpdate.notes = 'Parcel delivered to recipient';
      statusUpdate.currentLocation = this.parcel.deliveryAddress;
    } else {
      statusUpdate.notes = `Status updated to ${newStatus}`;
    }

    this.parcelsService.updateParcelStatus(this.parcel.id, statusUpdate).subscribe({
      next: (updatedParcel) => {
        this.parcel = updatedParcel;
        const actionText = newStatus === 'picked_up' ? 'Parcel picked up successfully' : 
                          newStatus === 'delivered_to_recipient' ? 'Parcel delivered successfully' :
                          `Parcel status updated to ${newStatus}`;
        this.toastService.showSuccess(actionText);
        
        // Update the delivery instructions to reflect the new status
        this.initializeDeliveryInstructions();
        this.loadStatusHistory(this.parcel.id);
      },
      error: (error) => {
        console.error('Error updating parcel status:', error);
        this.toastService.showError('Failed to update parcel status');
        
        // Revert the instruction completion if the update failed
        this.initializeDeliveryInstructions();
      },
      complete: () => {
        this.isUpdatingStatus = false; // Reset loading state
      }
    });
  }



  toggleView() {
    this.showMapView = !this.showMapView;
    
    // If showing map view, ensure markers are loaded
    if (this.showMapView && this.mapMarkers.length === 0) {
      console.log('Map view toggled on, setting up markers');
      this.setupMapMarkers();
    }
    
    // If map is now visible and we have markers, fit to markers
    if (this.showMapView && this.mapMarkers.length > 0) {
      setTimeout(() => {
        this.fitMapToMarkers();
      }, 100);
    }
  }

  optimizeRoute() {
    if (this.mapMarkers.length >= 2) {
      // In a real app, this would call a routing optimization API
      this.routeInfo.optimized = true;
      this.toastService.showSuccess('Route optimized successfully');
      
      // Recalculate route with optimization
      this.calculateRouteInfo();
    } else {
      this.toastService.showError('Need at least 2 locations to optimize route');
    }
  }

  updateCurrentLocation() {
    // In a real app, this would get the actual GPS location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation: MapLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            description: 'Your Updated Location',
            address: 'Current Location'
          };
          
          // Update current location marker
          if (this.currentLocation) {
            this.currentLocation = newLocation;
            const currentMarkerIndex = this.mapMarkers.findIndex(m => m.address === 'Current Location');
            if (currentMarkerIndex !== -1) {
              this.mapMarkers[currentMarkerIndex] = newLocation;
            }
          }
          
          this.toastService.showSuccess('Location updated successfully');
        },
        (error) => {
          console.error('Error getting location:', error);
          this.toastService.showError('Failed to get current location');
        }
      );
    } else {
      this.toastService.showError('Geolocation not supported');
    }
  }

  onMapReady(map: L.Map): void {
    console.log('Map is ready for driver parcel details');
    console.log('Current markers:', this.mapMarkers);
    console.log('Current marker types:', this.mapMarkerTypes);
    
    // Ensure map component is properly initialized
    if (this.mapComponent && this.mapComponent.isMapReady() && this.mapMarkers.length > 0) {
      // Small delay to ensure everything is properly rendered
      setTimeout(() => {
        if (this.mapComponent && this.mapComponent.isMapReady()) {
          console.log('Fitting map to markers after map ready');
          this.mapComponent.fitToMarkersAlways();
        }
      }, 200);
    } else {
      console.log('Map component not ready or no markers available');
    }
  }

  onMarkerClick(location: MapLocation): void {
    console.log('Marker clicked:', location);
  }

  onMapClick(coordinates: MapCoordinates): void {
    console.log('Map clicked at:', coordinates);
  }

  onMapError(error: MapError): void {
    console.error('Map error:', error);
  }

  onRouteUpdated(routeInfo: { distance: number; estimatedTime: number }): void {
    console.log('Route updated:', routeInfo);
    this.routeInfo = {
      distance: routeInfo.distance,
      estimatedTime: routeInfo.estimatedTime,
      optimized: this.routeInfo.optimized
    };
  }

  fitMapToMarkers(): void {
    console.log('fitMapToMarkers called - mapComponent:', !!this.mapComponent, 'markers count:', this.mapMarkers.length, 'showMapView:', this.showMapView);
    console.log('Markers:', this.mapMarkers);
    console.log('Marker types:', this.mapMarkerTypes);
    
    if (this.mapMarkers.length === 0) {
      console.warn('No markers available to fit');
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
        } else {
          console.error('Map component still not ready after delay');
        }
      }, 100);
      return;
    }
    
    // Force map refresh and then fit to markers
    this.mapComponent.forceMapRefresh();
    console.log('Fitting map to show all markers');
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
  }



  goBack() {
    this.router.navigate(['/driver/my-parcels']);
  }

  // Helper methods for new features
  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'fas fa-clock';
      case 'assigned': return 'fas fa-user-check';
      case 'picked_up': return 'fas fa-box-open';
      case 'in_transit': return 'fas fa-truck';
      case 'delivered_to_recipient': return 'fas fa-handshake';
      case 'delivered': return 'fas fa-check-circle';
      case 'completed': return 'fas fa-star';
      case 'cancelled': return 'fas fa-times-circle';
      default: return 'fas fa-info-circle';
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered_to_recipient': return 'Delivered to Recipient';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  getStatusDescription(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'Parcel is waiting to be assigned to a driver';
      case 'assigned': return 'Parcel has been assigned to a driver';
      case 'picked_up': return 'Parcel has been picked up from sender';
      case 'in_transit': return 'Parcel is on its way to recipient';
      case 'delivered_to_recipient': return 'Parcel has been delivered to recipient';
      case 'delivered': return 'Delivery has been confirmed';
      case 'completed': return 'Delivery process is complete';
      case 'cancelled': return 'Delivery has been cancelled';
      default: return 'Status update';
    }
  }

  getEstimatedDeliveryTime(): string {
    if (!this.parcel) return 'Calculating...';
    
    const now = new Date();
    const created = this.parcel.createdAt ? new Date(this.parcel.createdAt) : now;
    const timeDiff = now.getTime() - created.getTime();
    const hoursDiff = timeDiff / (1000 * 3600);
    
    if (hoursDiff < 1) {
      return 'Within 1 hour';
    } else if (hoursDiff < 24) {
      return `Within ${Math.ceil(hoursDiff)} hours`;
    } else {
      const daysDiff = Math.ceil(hoursDiff / 24);
      return `Within ${daysDiff} days`;
    }
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString();
  }

  getLocationForInstruction(index: number): string {
    if (index === 0) {
      return this.parcel?.pickupAddress || 'Pickup location';
    } else if (index === 1) {
      return this.parcel?.deliveryAddress || 'Delivery location';
    }
    return 'Unknown location';
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'assigned': return 'status-assigned';
      case 'picked_up': return 'status-picked';
      case 'in_transit': return 'status-transit';
      case 'delivered_to_recipient': return 'status-delivered';
      case 'delivered': return 'status-delivered';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }
} 