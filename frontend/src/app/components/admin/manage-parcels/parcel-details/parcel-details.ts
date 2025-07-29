import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MapComponent } from '../../../shared/map/map.component';
import { MapService } from '../../../../services/map.service';
import { MapLocation, MapCoordinates, MapError, MapMarkerType } from '../../../../types/map.types';
import { ToastService } from '../../../shared/toast/toast.service';
import { SidebarComponent } from '../../../shared/sidebar/sidebar';
import { ParcelsService } from '../../../../services/parcels.service';
import { AuthService } from '../../../../services/auth.service';
import * as L from 'leaflet';

interface ParcelDetailsData {
  id: string;
  trackingNumber: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Completed' | 'Cancelled';
  pickupDate: string;
  deliveryDate: string;
  weight: string;
  dimensions: string;
  price: string;
  currentLocation?: string;
  estimatedTime?: string;
  driver?: {
    id?: string;
    name: string;
    phone: string;
    email: string;
    vehicleNumber: string;
    licenseNumber: string;
    profilePicture?: string;
  };
  sender: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  receiver: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  orderHistory: Array<{
    status: string;
    date: string;
    time: string;
    icon: string;
    location?: string;
  }>;
}

@Component({
  selector: 'app-parcel-details',
  imports: [CommonModule, FormsModule, RouterModule, MapComponent, SidebarComponent],
  templateUrl: './parcel-details.html',
  styleUrl: './parcel-details.css'
})
export class ParcelDetails implements OnInit {
  @ViewChild('mapComponent', { static: false }) mapComponent!: MapComponent;
  
  parcelId: string = '';
  parcel: ParcelDetailsData | null = null;
  loading = false;

  // Map-related properties
  mapMarkers: MapLocation[] = [];
  mapCenter: MapCoordinates = { lat: -1.2921, lng: 36.8219 }; // Nairobi
  showMapView: boolean = true;
  mapMarkerTypes: MapMarkerType[] = [];
  
  // Route information for tracking details
  routeDistance: string = '';
  routeDuration: string = '';

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private mapService: MapService,
    private toastService: ToastService,
    private parcelsService: ParcelsService,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    this.route.params.subscribe(params => {
      this.parcelId = params['id'];
      this.loadParcelDetails();
    });

    // Check if redirected from assign driver with newly assigned driver
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state.newlyAssigned && state.assignedDriverId) {
        // Update the parcel with the newly assigned driver
        await this.updateParcelWithNewDriver(state.assignedDriverId, state.isReassignment);
      }
    }
  }

  ngAfterViewInit() {
    // Ensure map is properly fitted after view is initialized
    setTimeout(() => {
      if (this.showMapView && this.mapComponent && this.mapComponent.isMapReady() && this.mapMarkers.length > 0) {
        this.mapComponent.fitToMarkersAlways();
      }
    }, 1000);
  }

  loadParcelDetails() {
    this.loading = true;
    
    // Get the parcel ID from the URL parameter
    const parcelId = this.parcelId.replace('#', ''); // Remove # from parcel ID if present
    
    // Check if we have parcel details from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state.parcelDetails) {
        // Use the parcel details from navigation state
        this.createParcelFromDetails(state.parcelDetails);
        this.loading = false;
        return;
      }
    }
    
    // Call the API to get the actual parcel details
    this.parcelsService.getParcel(parcelId).subscribe({
      next: async (response: any) => {
        await this.createParcelFromApiResponse(response);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('❌ Error fetching parcel details:', error);
        console.error('❌ Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        
        if (error.status === 404) {
          this.toastService.showError(`Parcel with ID ${parcelId} not found`);
        } else if (error.status === 401) {
          this.toastService.showError('Authentication failed. Please login again.');
        } else {
          this.toastService.showError('Failed to load parcel details. Please try again.');
        }
        
        this.loading = false;
      }
    });
  }

  private createParcelFromDetails(parcelDetails: any) {
    // Create detailed parcel data from the provided details
    const weight = '5 kg';
    this.parcel = {
      id: parcelDetails.id,
      trackingNumber: parcelDetails.trackingNumber || parcelDetails.id,
      status: 'Pending' as 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled',
      pickupDate: this.getPickupDate(new Date().toISOString().split('T')[0]),
      deliveryDate: new Date().toISOString().split('T')[0],
      weight: weight,
      dimensions: '25x15x8 cm',
      price: this.calculatePriceFromWeight(weight),
      driver: undefined, // Will be assigned later
      sender: {
        name: parcelDetails.senderName || 'Unknown Sender',
        address: parcelDetails.pickupAddress || 'Address not available',
        phone: parcelDetails.senderPhone || 'Not available',
        email: parcelDetails.senderEmail || 'Not available'
      },
      receiver: {
        name: parcelDetails.recipientName || 'Unknown Receiver',
        address: parcelDetails.deliveryAddress || 'Address not available',
        phone: parcelDetails.recipientPhone || 'Not available',
        email: parcelDetails.recipientEmail || 'Not available'
      },
      orderHistory: parcelDetails.statusHistory ? 
        this.mapStatusHistoryToOrderHistory(parcelDetails.statusHistory) : 
        this.generateOrderHistory('Pending', new Date().toISOString().split('T')[0])
    };

    // Setup map markers after parcel is loaded
    if (this.parcel) {
      this.setupMapMarkers();
    }
  }

  private async createParcelFromApiResponse(apiResponse: any) {
    // Convert API response to the format expected by the component
    const weight = `${apiResponse.weight || 5} kg`;
    const status = this.mapStatus(apiResponse.status);
    
    this.parcel = {
      id: apiResponse.id,
      trackingNumber: apiResponse.trackingNumber || apiResponse.id,
      status: status,
      pickupDate: this.formatDateTime(apiResponse.actualPickupTime || apiResponse.estimatedPickupTime),
      deliveryDate: this.formatDateTime(apiResponse.actualDeliveryTime || apiResponse.estimatedDeliveryTime),
      weight: weight,
      dimensions: '25x15x8 cm',
      price: `KSH ${apiResponse.price || this.calculatePriceFromWeight(weight).replace('KSH ', '')}`,
      currentLocation: apiResponse.currentLocation,
      estimatedTime: this.calculateEstimatedTime(apiResponse.actualPickupTime || apiResponse.estimatedPickupTime, apiResponse.actualDeliveryTime || apiResponse.estimatedDeliveryTime),
      driver: apiResponse.driverId ? await this.getDriverInfoById(apiResponse.driverId) : undefined,
      sender: {
        name: apiResponse.senderName || 'Unknown Sender',
        address: apiResponse.pickupAddress || 'Address not available',
        phone: apiResponse.senderPhone || 'Not available',
        email: apiResponse.senderEmail || 'Not available'
      },
      receiver: {
        name: apiResponse.recipientName || 'Unknown Receiver',
        address: apiResponse.deliveryAddress || 'Address not available',
        phone: apiResponse.recipientPhone || 'Not available',
        email: apiResponse.recipientEmail || 'Not available'
      },
      orderHistory: this.mapStatusHistoryToOrderHistory(apiResponse.statusHistory || [])
    };
    
    // Setup map markers after parcel is loaded
    if (this.parcel) {
      this.setupMapMarkers();
    }
  }



  private mapStatus(apiStatus: string): 'Pending' | 'In Transit' | 'Delivered' | 'Completed' | 'Cancelled' {
    switch (apiStatus?.toLowerCase()) {
      case 'pending':
      case 'assigned':
        return 'Pending';
      case 'picked_up':
      case 'in_transit':
        return 'In Transit';
      case 'delivered':
      case 'delivered_to_recipient':
        return 'Delivered';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  private getPickupDate(deliveryDate: string): string {
    const delivery = new Date(deliveryDate);
    const pickup = new Date(delivery);
    pickup.setDate(pickup.getDate() - 3);
    return pickup.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
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
    if (!pickupTime || !deliveryTime) return 'TBD';
    
    try {
      const pickup = typeof pickupTime === 'string' ? new Date(pickupTime) : pickupTime;
      const delivery = typeof deliveryTime === 'string' ? new Date(deliveryTime) : deliveryTime;
      
      if (isNaN(pickup.getTime()) || isNaN(delivery.getTime())) return 'TBD';
      
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
      return 'TBD';
    }
  }



  private calculatePriceFromWeight(weight: string): string {
    // Extract numeric weight value from string like "2.5 kg"
    const weightMatch = weight.match(/(\d+\.?\d*)/);
    if (weightMatch) {
      const weightValue = parseFloat(weightMatch[1]);
      const price = weightValue * 100; // 100 KSH per 1kg
      return `KSH ${price.toLocaleString()}`;
    }
    return 'KSH 500'; // Default fallback
  }



  private generateOrderHistory(status: string, deliveryDate: string): Array<{status: string, date: string, time: string, icon: string, location?: string}> {
    const history = [
      {
        status: 'Order Placed',
        date: this.getPickupDate(deliveryDate),
        time: '10:00 AM',
        icon: 'fas fa-circle',
        location: 'Pickup Location'
      }
    ];

    // Add "Driver Assigned" step if parcel has a driver but is still pending
    if (this.parcel?.driver && status === 'Pending') {
      history.push({
        status: 'Driver Assigned',
        date: this.getPickupDate(deliveryDate),
        time: '11:30 AM',
        icon: 'fas fa-user-plus',
        location: 'Pickup Location'
      });
    }

    if (status === 'In Transit' || status === 'Delivered') {
      history.push({
        status: 'Picked Up',
        date: this.getPickupDate(deliveryDate),
        time: '2:00 PM',
        icon: 'fas fa-box',
        location: 'Pickup Location'
      });
      
      history.push({
        status: 'In Transit',
        date: deliveryDate,
        time: '9:00 AM',
        icon: 'fas fa-truck',
        location: 'Delivery Location'
      });
    }

    if (status === 'Delivered') {
      history.push({
        status: 'Delivered',
        date: deliveryDate,
        time: '3:00 PM',
        icon: 'fas fa-check-circle',
        location: 'Delivery Location'
      });
    }

    return history;
  }

  private mapStatusHistoryToOrderHistory(statusHistory: any[]): Array<{status: string, date: string, time: string, icon: string, location?: string}> {
    if (!statusHistory || statusHistory.length === 0) {
      // Fallback to generated history if no real data
      return this.generateOrderHistory('Pending', new Date().toISOString());
    }

    return statusHistory.map((historyItem, index) => {
      const status = this.mapStatusDisplayName(historyItem.status);
      const date = this.formatDateTime(historyItem.timestamp);
      const time = this.formatTime(historyItem.timestamp);
      const icon = this.getStatusIcon(historyItem.status);
      const location = historyItem.location || this.getDefaultLocation(historyItem.status);

      return {
        status,
        date,
        time,
        icon,
        location
      };
    });
  }

  private mapStatusDisplayName(status: string): string {
    switch (status) {
      case 'pending': return 'Order Placed';
      case 'assigned': return 'Driver Assigned';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered_to_recipient': return 'Delivered to Recipient';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pending': return 'fas fa-circle';
      case 'assigned': return 'fas fa-user-plus';
      case 'picked_up': return 'fas fa-box';
      case 'in_transit': return 'fas fa-truck';
      case 'delivered_to_recipient': return 'fas fa-flag-checkered';
      case 'delivered': return 'fas fa-check-circle';
      case 'completed': return 'fas fa-check-double';
      case 'cancelled': return 'fas fa-times-circle';
      default: return 'fas fa-circle';
    }
  }

  private getDefaultLocation(status: string): string {
    switch (status) {
      case 'pending':
      case 'assigned':
      case 'picked_up':
        return 'Pickup Location';
      case 'in_transit':
      case 'delivered_to_recipient':
      case 'delivered':
      case 'completed':
        return 'Delivery Location';
      default:
        return 'Unknown Location';
    }
  }

  private formatTime(timestamp: string | Date): string {
    if (!timestamp) return 'TBD';
    
    try {
      const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(date.getTime())) return 'TBD';
      
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'TBD';
    }
  }

  private getDriverInfo(driverName: string): {id?: string, name: string, phone: string, email: string, vehicleNumber: string, licenseNumber: string, profilePicture?: string} {
    // This method is kept for backward compatibility but should be replaced with getDriverInfoById
    return {
      id: undefined,
      name: driverName || 'Unknown Driver',
      phone: 'Not available',
      email: 'Not available',
      vehicleNumber: 'Not available',
      licenseNumber: 'Not available',
      profilePicture: undefined
    };
  }

  private async getDriverInfoById(driverId: string): Promise<{id?: string, name: string, phone: string, email: string, vehicleNumber: string, licenseNumber: string, profilePicture?: string}> {
    try {
      // Import DriversService dynamically to avoid circular dependency
      const { DriversService } = await import('../../../../services/drivers.service');
      const driversService = new DriversService(
        this.http,
        this.authService,
        this.toastService
      );

      const driver = await driversService.getDriver(driverId).toPromise();
      
      if (!driver) {
        throw new Error('Driver not found');
      }
      
      return {
        id: driver.id,
        name: driver.name || 'Unknown Driver',
        phone: driver.phone || 'Not available',
        email: driver.email || 'Not available',
        vehicleNumber: driver.vehicleNumber || 'Not available',
        licenseNumber: driver.licenseNumber || 'Not available',
        profilePicture: driver.profilePicture || undefined
      };
    } catch (error) {
      console.error('Error fetching driver info:', error);
      return {
        id: driverId,
        name: 'Unknown Driver',
        phone: 'Not available',
        email: 'Not available',
        vehicleNumber: 'Not available',
        licenseNumber: 'Not available',
        profilePicture: undefined
      };
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'In Transit': return 'status-transit';
      case 'Delivered': return 'status-delivered';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  updateStatus() {
    // TODO: Implement status update functionality
    console.log('Update status clicked');
  }

  assignDriver() {
    if (!this.parcel) {
      this.toastService.showError('No parcel details available');
      return;
    }

    // Create parcel details object for the assign driver component
    const parcelDetails = {
      id: this.parcel.id,
      trackingNumber: this.parcel.trackingNumber,
      pickupAddress: this.parcel.sender.address,
      deliveryAddress: this.parcel.receiver.address,
      weight: parseFloat(this.parcel.weight.replace(' kg', '')),
      price: parseFloat(this.parcel.price.replace('KSH ', '').replace(',', '')),
      senderName: this.parcel.sender.name,
      recipientName: this.parcel.receiver.name
    };

    console.log('Navigating to assign driver with parcel details:', parcelDetails);

    // Store parcel details in service as backup
    this.parcelsService.setTempParcelDetails(parcelDetails, false);

    // Navigate to assign driver page with parcel details
    this.router.navigate(['/admin-assign-driver'], {
      state: { parcelDetails }
    });
  }

  reassignDriver() {
    if (!this.parcel) {
      this.toastService.showError('No parcel details available');
      return;
    }

    // Create parcel details object for the assign driver component
    const parcelDetails = {
      id: this.parcel.id,
      trackingNumber: this.parcel.trackingNumber,
      pickupAddress: this.parcel.sender.address,
      deliveryAddress: this.parcel.receiver.address,
      weight: parseFloat(this.parcel.weight.replace(' kg', '')),
      price: parseFloat(this.parcel.price.replace('KSH ', '').replace(',', '')),
      senderName: this.parcel.sender.name,
      recipientName: this.parcel.receiver.name
    };

    console.log('Navigating to reassign driver with parcel details:', parcelDetails);

    // Store parcel details in service as backup
    this.parcelsService.setTempParcelDetails(parcelDetails, true, this.parcel.driver?.id || undefined);

    // Navigate to assign driver page with parcel details and reassign flag
    this.router.navigate(['/admin-assign-driver'], {
      state: { 
        parcelDetails,
        isReassignment: true,
        currentDriverId: this.parcel.driver?.id || undefined
      }
    });
  }

  goBack() {
    window.history.back();
  }

  private async updateParcelWithNewDriver(driverId: string, isReassignment: boolean = false) {
    if (this.parcel) {
      // Get real driver data from API
      const driverInfo = await this.getDriverInfoById(driverId);
      
      // Update parcel driver (status remains 'Pending' until driver starts journey)
      this.parcel.driver = driverInfo;
      
      // Add new activity log entry
      const action = isReassignment ? 'Driver Reassigned' : 'Driver Assigned';
      const icon = isReassignment ? 'fas fa-exchange-alt' : 'fas fa-user-plus';
      
      this.parcel.orderHistory.unshift({
        status: action,
        date: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        icon: icon
      });

      // Show success message
      this.toastService.showSuccess(`${action} successfully!`);
    }
  }

  private getDriverNameById(driverId: string): string {
    // This method is kept for backward compatibility but should be replaced with API calls
    return 'Unknown Driver';
  }

  // Map-related methods
  private async setupMapMarkers(): Promise<void> {
    if (!this.parcel) return;

    try {
      this.mapMarkers = [];
      this.mapMarkerTypes = [];

      // Geocode sender address (pickup location)
      const pickupResult = await this.mapService.geocodeAddress(this.parcel.sender.address);
      if (pickupResult.success && pickupResult.location) {
        this.mapMarkers.push({
          ...pickupResult.location,
          description: `<strong>Pickup Location</strong><br>${this.parcel.sender.address}`,
          address: this.parcel.sender.address
        });
        this.mapMarkerTypes.push(MapMarkerType.PICKUP);
      } else {
        console.warn('Failed to geocode pickup address:', this.parcel.sender.address);
      }

      // Geocode receiver address (delivery location)
      const deliveryResult = await this.mapService.geocodeAddress(this.parcel.receiver.address);
      if (deliveryResult.success && deliveryResult.location) {
        this.mapMarkers.push({
          ...deliveryResult.location,
          description: `<strong>Delivery Location</strong><br>${this.parcel.receiver.address}`,
          address: this.parcel.receiver.address
        });
        this.mapMarkerTypes.push(MapMarkerType.DELIVERY);
      } else {
        console.warn('Failed to geocode delivery address:', this.parcel.receiver.address);
      }

      // Add driver location marker if parcel is in transit and has a driver
      if (this.parcel.status === 'In Transit' && this.parcel.driver) {
        // Try to get driver's current location from the parcel data
        let driverLocation: MapCoordinates;
        
        // For admin view, we can try to get driver's actual location from API
        // For now, we'll place driver between pickup and delivery or near pickup
        if (this.mapMarkers.length >= 2) {
          // Place driver between pickup and delivery points
          driverLocation = {
            lat: (this.mapMarkers[0].lat + this.mapMarkers[1].lat) / 2,
            lng: (this.mapMarkers[0].lng + this.mapMarkers[1].lng) / 2
          };
        } else if (this.mapMarkers.length === 1) {
          // Place driver near pickup location
          driverLocation = {
            lat: this.mapMarkers[0].lat + 0.005,
            lng: this.mapMarkers[0].lng + 0.005
          };
        } else {
          // Fallback to default location
          driverLocation = {
            lat: -1.2921,
            lng: 36.8219
          };
        }
        
        this.mapMarkers.push({
          ...driverLocation,
          description: `<strong>Driver Location</strong><br>${this.parcel.driver.name} - ${this.parcel.driver.vehicleNumber}<br>Phone: ${this.parcel.driver.phone}<br>Email: ${this.parcel.driver.email}`,
          address: `Driver: ${this.parcel.driver.name}`
        });
        this.mapMarkerTypes.push(MapMarkerType.DRIVER);
      }

      // Create new array references to trigger change detection
      this.mapMarkers = [...this.mapMarkers];
      this.mapMarkerTypes = [...this.mapMarkerTypes];

      // Update map center to show all markers
      this.updateMapCenter();
      
      // Calculate route information for tracking details
      this.calculateRouteInfo();
      
      // Now that all markers are loaded, fit the map if it's ready
      this.fitMapAfterMarkersLoaded();
      
    } catch (error) {
      console.error('Error setting up map markers:', error);
      this.toastService.showError('Failed to load map markers');
    }
  }

  private fitMapAfterMarkersLoaded(): void {
    if (this.mapMarkers.length === 0) {
      return;
    }

    // Force the MapComponent to update its markers
    if (this.mapComponent && this.mapComponent.isMapReady()) {
      // Trigger change detection by calling updateMarkersList
      this.mapComponent.updateMarkersList(this.mapMarkers);
    }

    // If map is visible and ready, fit to markers
    if (this.showMapView && this.mapComponent && this.mapComponent.isMapReady()) {
      setTimeout(() => {
        if (this.mapComponent && this.mapComponent.isMapReady()) {
          this.mapComponent.fitToMarkersAlways();
        }
      }, 300);
    } else if (this.showMapView) {
      // If map view is shown but component not ready, try again later
      setTimeout(() => {
        if (this.mapComponent && this.mapComponent.isMapReady()) {
          this.mapComponent.fitToMarkersAlways();
        }
      }, 800);
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
    
    // If showing the map, ensure it's properly initialized
    if (this.showMapView && this.mapComponent) {
      setTimeout(() => {
        if (this.mapComponent && this.mapComponent.isMapReady()) {
          this.mapComponent.onMapToggle();
        }
      }, 100);
    }
  }

  onMapReady(map: L.Map): void {
    // Store the map reference for direct access
    const leafletMap = map;
    
    // If markers are already loaded, fit the map immediately
    if (this.mapMarkers.length > 0) {
      if (this.mapComponent && this.mapComponent.isMapReady()) {
        this.mapComponent.fitToMarkersAlways();
      } else {
        this.mapService.fitMapToMarkers(leafletMap, this.mapMarkers.map(marker => 
          L.marker([marker.lat, marker.lng])
        ));
      }
    } else {
      // Wait for markers to be loaded (setupMapMarkers is async)
      setTimeout(() => {
        if (this.mapMarkers.length > 0) {
          if (this.mapComponent && this.mapComponent.isMapReady()) {
            this.mapComponent.fitToMarkersAlways();
          } else {
            this.mapService.fitMapToMarkers(leafletMap, this.mapMarkers.map(marker => 
              L.marker([marker.lat, marker.lng])
            ));
          }
        }
      }, 1000);
      
      // Try again after a longer delay in case geocoding takes more time
      setTimeout(() => {
        if (this.mapMarkers.length > 0) {
          if (this.mapComponent && this.mapComponent.isMapReady()) {
            this.mapComponent.fitToMarkersAlways();
          } else {
            this.mapService.fitMapToMarkers(leafletMap, this.mapMarkers.map(marker => 
              L.marker([marker.lat, marker.lng])
            ));
          }
        }
      }, 2000);
    }
  }

  onMarkerClick(location: MapLocation): void {
    console.log('Marker clicked:', location);
    
    // Show toast notification with location details
    if (location.description) {
      // Extract the location type from the description
      const locationType = location.description.includes('Pickup') ? 'Pickup' : 
                          location.description.includes('Delivery') ? 'Delivery' : 
                          location.description.includes('Driver') ? 'Driver' : 'Location';
      
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
      // Wait longer for the map component to be fully rendered and initialized
      setTimeout(() => {
        this.fitMapToMarkers();
      }, 500);
      return;
    }
    
    // Try using the map component if available
    if (this.mapComponent && this.mapComponent.isMapReady()) {
      this.mapComponent.forceMapRefresh();
      console.log('Fitting map to show all markers (via component)');
      this.toastService.showInfo('Map adjusted to show all locations');
    } else {
      console.warn('Map component not ready, attempting to fit after delay');
      // Try again after a longer delay to ensure full initialization
      setTimeout(() => {
        if (this.mapComponent && this.mapComponent.isMapReady()) {
          this.mapComponent.forceMapRefresh();
          console.log('Fitting map to show all markers (delayed via component)');
          this.toastService.showInfo('Map adjusted to show all locations');
        } else {
          console.error('Map component still not ready after delay');
          // Try one more time with an even longer delay
          setTimeout(() => {
            if (this.mapComponent && this.mapComponent.isMapReady()) {
              this.mapComponent.forceMapRefresh();
              console.log('Fitting map to show all markers (second attempt via component)');
              this.toastService.showInfo('Map adjusted to show all locations');
            } else {
              console.log('Map component not available, using fallback approach');
              this.toastService.showInfo('Map adjusted to show all locations');
            }
          }, 1000);
        }
      }, 300);
    }
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

  onDriverImageError(event: any): void {
    // Hide the image and show the fallback icon
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    
    // The fallback icon will show automatically since it's in the same container
    console.log('Driver profile image failed to load, showing fallback icon');
  }
} 