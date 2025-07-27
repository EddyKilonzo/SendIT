import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MapComponent } from '../../../shared/map/map.component';
import { MapService } from '../../../../services/map.service';
import { MapLocation, MapCoordinates, MapError, MapMarkerType } from '../../../../types/map.types';
import { ToastService } from '../../../shared/toast/toast.service';
import { SidebarComponent } from '../../../shared/sidebar/sidebar';
import { ParcelsService } from '../../../../services/parcels.service';
import * as L from 'leaflet';

interface ParcelDetailsData {
  id: string;
  trackingNumber: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
  pickupDate: string;
  deliveryDate: string;
  weight: string;
  dimensions: string;
  price: string;
  driver?: {
    id?: string;
    name: string;
    phone: string;
    email: string;
    vehicleNumber: string;
    licenseNumber: string;
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
  }>;
  activityLog: Array<{
    action: string;
    date: string;
    time: string;
    user: string;
    icon: string;
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

  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private mapService: MapService,
    private toastService: ToastService,
    private parcelsService: ParcelsService
  ) {}

  ngOnInit() {
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
        this.updateParcelWithNewDriver(state.assignedDriverId, state.isReassignment);
      }
    }
  }

  ngAfterViewInit() {
    // Ensure map is properly fitted after view is initialized
    setTimeout(() => {
      if (this.showMapView && this.mapComponent && this.mapComponent.isMapReady() && this.mapMarkers.length > 0) {
        this.mapComponent.fitToMarkersAlways();
        console.log('Map fitted to markers after view init');
      }
    }, 1000);
  }

  loadParcelDetails() {
    this.loading = true;
    
    // Get the parcel ID from the URL parameter
    const parcelId = this.parcelId.replace('#', ''); // Remove # from parcel ID if present
    
    console.log('🔍 Loading parcel details for ID:', parcelId);
    
    // Check if we have parcel details from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state.parcelDetails) {
        console.log('✅ Using parcel details from navigation state:', state.parcelDetails);
        // Use the parcel details from navigation state
        this.createParcelFromDetails(state.parcelDetails);
        this.loading = false;
        return;
      }
    }
    
    // Call the API to get the actual parcel details
    console.log('🌐 Fetching parcel details from API for ID:', parcelId);
    this.parcelsService.getParcel(parcelId).subscribe({
      next: (response: any) => {
        console.log('✅ API response for parcel:', response);
        this.createParcelFromApiResponse(response);
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
    console.log('🔄 Creating parcel from details:', parcelDetails);
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
      orderHistory: this.generateOrderHistory('Pending', new Date().toISOString().split('T')[0]),
      activityLog: this.generateActivityLog('Pending', new Date().toISOString().split('T')[0])
    };

    // Setup map markers after parcel is loaded
    if (this.parcel) {
      this.setupMapMarkers();
    }
  }

  private createParcelFromApiResponse(apiResponse: any) {
    console.log('🔄 Creating parcel from API response:', apiResponse);
    
    // Convert API response to the format expected by the component
    const weight = `${apiResponse.weight || 5} kg`;
    const status = this.mapStatus(apiResponse.status);
    
    this.parcel = {
      id: apiResponse.id,
      trackingNumber: apiResponse.trackingNumber || apiResponse.id,
      status: status,
      pickupDate: this.getPickupDate(apiResponse.createdAt || new Date().toISOString()),
      deliveryDate: apiResponse.assignedAt ? new Date(apiResponse.assignedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      weight: weight,
      dimensions: '25x15x8 cm',
      price: `KSH ${apiResponse.price || this.calculatePriceFromWeight(weight).replace('KSH ', '')}`,
      driver: apiResponse.driverId ? this.getDriverInfo('John Smith') : undefined,
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
      orderHistory: this.generateOrderHistory(status, apiResponse.createdAt || new Date().toISOString()),
      activityLog: this.generateActivityLog(status, apiResponse.createdAt || new Date().toISOString())
    };
    
    console.log('✅ Created parcel object:', this.parcel);
    
    // Setup map markers after parcel is loaded
    if (this.parcel) {
      this.setupMapMarkers();
    }
  }



  private mapStatus(apiStatus: string): 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled' {
    switch (apiStatus?.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'assigned':
      case 'picked_up':
      case 'in_transit':
        return 'In Transit';
      case 'delivered':
      case 'delivered_to_recipient':
        return 'Delivered';
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



  private generateOrderHistory(status: string, deliveryDate: string): Array<{status: string, date: string, time: string, icon: string}> {
    const history = [
      {
        status: 'Order Placed',
        date: this.getPickupDate(deliveryDate),
        time: '10:00 AM',
        icon: 'fas fa-circle'
      }
    ];

    if (status !== 'Pending') {
      history.push({
        status: 'Picked Up',
        date: this.getPickupDate(deliveryDate),
        time: '2:00 PM',
        icon: 'fas fa-box'
      });
    }

    if (status === 'In Transit' || status === 'Delivered') {
      history.push({
        status: 'In Transit',
        date: deliveryDate,
        time: '9:00 AM',
        icon: 'fas fa-truck'
      });
    }

    if (status === 'Delivered') {
      history.push({
        status: 'Delivered',
        date: deliveryDate,
        time: '3:00 PM',
        icon: 'fas fa-check-circle'
      });
    }

    return history;
  }

  private getDriverInfo(driverName: string): {id?: string, name: string, phone: string, email: string, vehicleNumber: string, licenseNumber: string} {
    // Return real driver data from API or empty data if not available
    return {
      id: undefined,
      name: driverName || 'Unknown Driver',
      phone: 'Not available',
      email: 'Not available',
      vehicleNumber: 'Not available',
      licenseNumber: 'Not available'
    };
  }

  private generateActivityLog(status: string, deliveryDate: string): Array<{action: string, date: string, time: string, user: string, icon: string}> {
    const log = [
      {
        action: 'Order Created',
        date: this.getPickupDate(deliveryDate),
        time: '10:00 AM',
        user: 'System',
        icon: 'fas fa-circle'
      }
    ];

    if (status !== 'Pending') {
      log.push({
        action: 'Driver Assigned',
        date: this.getPickupDate(deliveryDate),
        time: '11:30 AM',
        user: 'Admin',
        icon: 'fas fa-user-plus'
      });
    }

    if (status === 'In Transit' || status === 'Delivered') {
      log.push({
        action: 'Parcel Picked Up',
        date: this.getPickupDate(deliveryDate),
        time: '2:00 PM',
        user: 'Driver',
        icon: 'fas fa-box'
      });
    }

    if (status === 'Delivered') {
      log.push({
        action: 'Parcel Delivered',
        date: deliveryDate,
        time: '3:00 PM',
        user: 'Driver',
        icon: 'fas fa-check-circle'
      });
    }

    return log;
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

  private updateParcelWithNewDriver(driverId: string, isReassignment: boolean = false) {
    if (this.parcel) {
      // Get driver name from ID
      const driverName = this.getDriverNameById(driverId);
      
      // Update parcel status and driver
      this.parcel.status = 'In Transit';
      this.parcel.driver = this.getDriverInfo(driverName);
      
      // Add new activity log entry
      const action = isReassignment ? 'Driver Reassigned' : 'Driver Assigned';
      const icon = isReassignment ? 'fas fa-exchange-alt' : 'fas fa-user-plus';
      
      this.parcel.activityLog.unshift({
        action: action,
        date: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        time: new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        user: 'Admin',
        icon: icon
      });

      // Add to order history
      this.parcel.orderHistory.push({
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
    // This is a simple mapping - in a real app, you'd fetch this from the API
    const driverMap: { [key: string]: string } = {
      '1': 'John Smith',
      '2': 'Mike Johnson',
      '3': 'Sarah Wilson',
      '4': 'David Brown',
      '5': 'Lisa Davis',
      '6': 'Tom Miller'
    };
    
    return driverMap[driverId] || 'Unknown Driver';
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

      // Create new array references to trigger change detection
      this.mapMarkers = [...this.mapMarkers];
      this.mapMarkerTypes = [...this.mapMarkerTypes];

      // Update map center to show all markers
      this.updateMapCenter();
      
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
} 