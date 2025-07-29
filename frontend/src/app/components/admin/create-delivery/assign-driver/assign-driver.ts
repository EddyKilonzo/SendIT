import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/toast/toast.service';
import { MapService } from '../../../../services/map.service';
import { MapMarkerType } from '../../../../types/map.types';
import { SidebarComponent } from '../../../shared/sidebar/sidebar';
import { DriversService, Driver, AssignParcelDto } from '../../../../services/drivers.service';
import { ParcelsService } from '../../../../services/parcels.service';
import * as L from 'leaflet';

interface ParcelDetails {
  id: string;
  trackingNumber?: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  price: number;
  pickupLat?: number;
  pickupLng?: number;
  deliveryLat?: number;
  deliveryLng?: number;
  estimatedDistance?: number;
  estimatedDeliveryTime?: number;
  senderName?: string;
  recipientName?: string;
}

interface DriverWithSelection extends Driver {
  isSelected: boolean;
}

@Component({
  selector: 'app-assign-driver',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './assign-driver.html',
  styleUrls: ['./assign-driver.css']
})
export class AssignDriver implements OnInit, OnDestroy {
  @Input() parcelDetails: ParcelDetails | null = null;
  @Output() driverAssigned = new EventEmitter<{ parcelId: string, driverId: string }>();

  assignForm: FormGroup;
  availableDrivers: DriverWithSelection[] = [];
  filteredDrivers: DriverWithSelection[] = [];
  selectedDriver: DriverWithSelection | null = null;
  isLoading: boolean = false;
  isReassignment: boolean = false;
  currentDriverId: string | null = null;

  // Filter options
  vehicleTypes = ['All', 'MOTORCYCLE', 'CAR', 'VAN', 'TRUCK'];
  ratingOptions = ['All', '4.5+', '4.0+', '3.5+'];

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 5;
  totalDrivers = 0;

  // Map properties
  private map: L.Map | null = null;
  private pickupMarker: L.Marker | null = null;
  private deliveryMarker: L.Marker | null = null;
  private driverMarkers: L.Marker[] = [];
  private routeLine: L.Polyline | null = null;
  private markers: L.Marker[] = [];
  mapLoading: boolean = true;
  mapError: boolean = false;

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private router: Router,
    private mapService: MapService,
    private driversService: DriversService,
    private parcelsService: ParcelsService
  ) {
    this.assignForm = this.fb.group({
      vehicleType: ['All'],
      rating: ['All']
    });
  }

  ngOnInit() {
    console.log('🚀 AssignDriver component initializing...');
    this.loadAvailableDrivers();
    this.setupFilterListeners();
    
    // Add window resize listener for map
    window.addEventListener('resize', this.handleResize.bind(this));
    
    // Check if parcel details were passed from navigation
    const navigation = this.router.getCurrentNavigation();
    console.log('🔍 Navigation state:', navigation?.extras.state);
    
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      console.log('🔍 State received:', state);
      
      if (state.parcelDetails) {
        this.parcelDetails = state.parcelDetails;
        console.log('✅ Parcel details received from navigation:', this.parcelDetails);
      }
      if (state.isReassignment) {
        this.isReassignment = state.isReassignment;
        this.currentDriverId = state.currentDriverId;
        console.log('🔄 Reassignment mode:', this.isReassignment, 'Current driver ID:', this.currentDriverId);
      }
    } else {
      console.log('⚠️ No navigation state found, checking service...');
    }
    
    // If no parcel details were passed from navigation, try to get from service as fallback
    if (!this.parcelDetails) {
      const tempParcelDetails = this.parcelsService.getTempParcelDetails();
      const tempReassignmentData = this.parcelsService.getTempReassignmentData();
      
      console.log('🔍 Temp parcel details from service:', tempParcelDetails);
      console.log('🔍 Temp reassignment data from service:', tempReassignmentData);
      
      if (tempParcelDetails) {
        this.parcelDetails = tempParcelDetails;
        if (tempReassignmentData) {
          this.isReassignment = tempReassignmentData.isReassignment;
          this.currentDriverId = tempReassignmentData.currentDriverId;
        }
        console.log('✅ Retrieved parcel details from service:', this.parcelDetails);
      } else {
        // If still no parcel details, redirect back to create delivery
        console.log('⚠️ No parcel details found, redirecting to create delivery');
        this.toastService.showError('No parcel details available. Please create a delivery first.');
        this.router.navigate(['/admin-create-delivery']);
        return;
      }
    }

    console.log('🎯 Final parcel details state:', this.parcelDetails);
    console.log('🎯 Final reassignment state:', this.isReassignment);

    // Initialize map after a short delay to ensure DOM is ready
    setTimeout(() => {
      console.log('🕐 Starting map initialization...');
      this.initializeMap();
    }, 500);
  }

  loadAvailableDrivers() {
    this.isLoading = true;
    console.log('🔍 Loading available drivers...');
    
    this.driversService.getAvailableDrivers().subscribe({
      next: (response: any) => {
        console.log('✅ Drivers API response:', response);
        this.availableDrivers = response.drivers.map((driver: any) => ({
          ...driver,
          isSelected: false
        }));
        
        // If this is a reassignment, exclude the current driver
        if (this.isReassignment && this.currentDriverId) {
          this.availableDrivers = this.availableDrivers.filter(driver => driver.id !== this.currentDriverId);
          console.log('🔄 Reassignment mode: Excluded current driver', this.currentDriverId);
        }
        
        this.filteredDrivers = [...this.availableDrivers];
        this.totalDrivers = this.availableDrivers.length;
        this.currentPage = 1;
        this.isLoading = false;
        console.log('📦 Loaded drivers:', this.availableDrivers);
        console.log('📊 Total drivers found:', this.availableDrivers.length);
        
        // Add driver markers to map after loading drivers
        if (this.map) {
          this.addDriverMarkers();
        }
      },
      error: (error: any) => {
        console.error('❌ Error loading drivers:', error);
        console.error('❌ Error details:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        this.isLoading = false;
        this.toastService.showError('Failed to load available drivers');
      }
    });
  }

  setupFilterListeners() {
    this.assignForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters() {
    const { vehicleType, rating } = this.assignForm.value;
    
    this.filteredDrivers = this.availableDrivers.filter(driver => {
      // Vehicle type filter
      if (vehicleType !== 'All' && driver.vehicleType !== vehicleType) {
        return false;
      }
      
      // Rating filter
      if (rating !== 'All') {
        const minRating = parseFloat(rating.replace('+', ''));
        if ((driver.averageRating || 0) < minRating) {
          return false;
        }
      }
      
      return true;
    });

    // Reset pagination when filters change
    this.currentPage = 1;
    this.totalDrivers = this.filteredDrivers.length;
  }

  // Get paginated drivers
  get paginatedDrivers(): DriverWithSelection[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredDrivers.slice(startIndex, endIndex);
  }

  // Get total pages
  get totalPages(): number {
    return Math.ceil(this.totalDrivers / this.itemsPerPage);
  }

  // Get page numbers to display
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Navigation methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  // Helper method for template
  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalDrivers);
  }

  selectDriver(driver: DriverWithSelection) {
    // Deselect all drivers
    this.availableDrivers.forEach(d => d.isSelected = false);
    this.filteredDrivers.forEach(d => d.isSelected = false);
    
    // Select the clicked driver
    driver.isSelected = true;
    this.selectedDriver = driver;
  }

  assignDriver() {
    if (!this.selectedDriver) {
      this.toastService.showError('Please select a driver first.');
      return;
    }

    if (!this.parcelDetails) {
      this.toastService.showError('No parcel details available. Please create a delivery first or go back to parcel details.');
      return;
    }

    if (this.isReassignment) {
      // Use the reassign endpoint for reassignment
      this.reassignDriver();
      return;
    }

    this.isLoading = true; // Set loading state

    const assignParcelDto: AssignParcelDto = {
      parcelId: this.parcelDetails.id,
      driverId: this.selectedDriver.id
    };

    this.driversService.assignParcel(assignParcelDto).subscribe({
      next: (response: any) => {
        this.isLoading = false; // Reset loading state
        this.toastService.showSuccess(`Driver ${this.selectedDriver?.name} assigned to parcel #${this.parcelDetails?.id}. Status: Pending driver to start journey.`);
        
        // Clear temporary parcel details
        this.parcelsService.clearTempParcelDetails();
        
        // Redirect to parcel details page
        setTimeout(() => {
          this.router.navigate(['/admin-parcel-details', this.parcelDetails?.id || ''], {
            state: { 
              assignedDriverId: this.selectedDriver?.id,
              newlyAssigned: true,
              parcelDetails: this.parcelDetails
            }
          });
        }, 1000);
      },
      error: (error: any) => {
        this.isLoading = false; // Reset loading state
        console.error('Error assigning driver:', error);
        this.toastService.showError('Failed to assign driver to parcel');
      }
    });
  }

  reassignDriver() {
    if (!this.selectedDriver) {
      this.toastService.showError('Please select a driver first.');
      return;
    }

    if (!this.parcelDetails) {
      this.toastService.showError('No parcel details available. Please go back to parcel details.');
      return;
    }

    this.isLoading = true; // Set loading state

    // Use the manage parcel endpoint for reassignment
    const reassignData = {
      action: 'reassign',
      newDriverId: this.selectedDriver.id
    };

    // We'll need to add this method to the admin service
    this.driversService.reassignParcel(this.parcelDetails.id, reassignData).subscribe({
      next: (response: any) => {
        this.isLoading = false; // Reset loading state
        this.toastService.showSuccess(`Parcel reassigned to driver ${this.selectedDriver?.name}. Status: Pending driver to start journey.`);
        
        // Clear temporary parcel details
        this.parcelsService.clearTempParcelDetails();
        
        // Redirect to parcel details page
        setTimeout(() => {
          this.router.navigate(['/admin-parcel-details', this.parcelDetails?.id || ''], {
            state: { 
              assignedDriverId: this.selectedDriver?.id,
              newlyAssigned: true,
              parcelDetails: this.parcelDetails,
              isReassignment: true
            }
          });
        }, 1000);
      },
      error: (error: any) => {
        this.isLoading = false; // Reset loading state
        console.error('Error reassigning driver:', error);
        this.toastService.showError('Failed to reassign driver to parcel');
      }
    });
  }

  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
  }

  goBack() {
    if (this.isReassignment && this.parcelDetails) {
      // If this is a reassignment, go back to the parcel details page
      this.router.navigate(['/admin-parcel-details', this.parcelDetails.id]);
    } else {
      // Otherwise, go back to manage parcels
      this.router.navigate(['/admin-manage-parcels']);
    }
  }

  // Map Methods
  public async initializeMap(): Promise<void> {
    try {
      console.log('🗺️ Initializing map...');
      this.mapLoading = true;
      this.mapError = false;
      
      // Check if map container exists
      const mapContainer = document.getElementById('assign-driver-map');
      if (!mapContainer) {
        console.error('❌ Map container not found: assign-driver-map');
        this.mapError = true;
        this.mapLoading = false;
        this.toastService.showError('Map container not found. Please refresh the page.');
        return;
      }
      
      console.log('✅ Map container found:', mapContainer);
      console.log('📏 Container dimensions:', {
        width: mapContainer.offsetWidth,
        height: mapContainer.offsetHeight,
        style: mapContainer.style.cssText
      });
      
      console.log('✅ Map container found, creating map instance...');
      
      // Check if Leaflet is available
      if (typeof L === 'undefined') {
        console.error('❌ Leaflet is not loaded');
        this.mapError = true;
        this.mapLoading = false;
        this.toastService.showError('Map library not loaded. Please refresh the page.');
        return;
      }
      
      console.log('✅ Leaflet is available:', L);
      
      // Create map instance
      try {
        this.map = this.mapService.createMap('assign-driver-map');
      } catch (error) {
        console.error('❌ Error creating map via service:', error);
        
        // Fallback: create map directly
        try {
          console.log('🔄 Attempting fallback map creation...');
          this.map = L.map('assign-driver-map').setView([-1.2921, 36.8219], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            minZoom: 1
          }).addTo(this.map);
          console.log('✅ Fallback map created successfully');
        } catch (fallbackError) {
          console.error('❌ Fallback map creation also failed:', fallbackError);
          this.mapError = true;
          this.mapLoading = false;
          this.toastService.showError('Failed to create map. Please refresh the page.');
          return;
        }
      }
      
      if (!this.map) {
        console.error('❌ Failed to create map instance');
        this.mapError = true;
        this.mapLoading = false;
        this.toastService.showError('Failed to create map. Please refresh the page.');
        return;
      }
      
      console.log('✅ Map instance created successfully');
      
      // Add markers for pickup and delivery locations
      await this.addLocationMarkers();
      
      // Add driver markers
      await this.addDriverMarkers();
      
      // Draw route between pickup and delivery
      await this.drawRoute();
      
      // Fit map to show all markers
      this.fitMapToBounds();
      
      // Force map to refresh its size
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
          console.log('🔄 Map size invalidated');
        }
      }, 100);
      
      console.log('✅ Map initialization completed successfully');
      this.mapLoading = false;
      
    } catch (error) {
      console.error('❌ Error initializing map:', error);
      this.mapError = true;
      this.mapLoading = false;
      this.toastService.showError('Failed to load map. Please refresh the page.');
    }
  }

  private async addLocationMarkers(): Promise<void> {
    if (!this.map || !this.parcelDetails) return;

    try {
      let pickupCoords, deliveryCoords;

      // Use real coordinates if available, otherwise geocode
      if (this.parcelDetails.pickupLat && this.parcelDetails.pickupLng) {
        pickupCoords = { lat: this.parcelDetails.pickupLat, lng: this.parcelDetails.pickupLng };
      } else {
        const pickupResult = await this.mapService.geocodeAddress(this.parcelDetails.pickupAddress);
        if (pickupResult.success && pickupResult.location) {
          pickupCoords = pickupResult.location;
        }
      }

      if (this.parcelDetails.deliveryLat && this.parcelDetails.deliveryLng) {
        deliveryCoords = { lat: this.parcelDetails.deliveryLat, lng: this.parcelDetails.deliveryLng };
      } else {
        const deliveryResult = await this.mapService.geocodeAddress(this.parcelDetails.deliveryAddress);
        if (deliveryResult.success && deliveryResult.location) {
          deliveryCoords = deliveryResult.location;
        }
      }

      // Add pickup marker if coordinates are available
      if (pickupCoords) {
        this.pickupMarker = this.mapService.createCustomMarker({
          location: pickupCoords,
          type: MapMarkerType.PICKUP,
          popupContent: `<strong>Pickup:</strong><br>${this.parcelDetails.pickupAddress}<br><strong>Parcel ID:</strong> #${this.parcelDetails.id}`
        });
        if (this.pickupMarker) {
          this.pickupMarker.addTo(this.map);
          this.markers.push(this.pickupMarker);
        }
      }

      // Add delivery marker if coordinates are available
      if (deliveryCoords) {
        this.deliveryMarker = this.mapService.createCustomMarker({
          location: deliveryCoords,
          type: MapMarkerType.DELIVERY,
          popupContent: `<strong>Delivery:</strong><br>${this.parcelDetails.deliveryAddress}<br><strong>Parcel ID:</strong> #${this.parcelDetails.id}`
        });
        if (this.deliveryMarker) {
          this.deliveryMarker.addTo(this.map);
          this.markers.push(this.deliveryMarker);
        }
      }

      // If no coordinates available, use fallback
      if (!pickupCoords && !deliveryCoords) {
        this.addFallbackMarkers();
      }

    } catch (error) {
      console.error('Error adding markers:', error);
      // Fallback to default coordinates if geocoding fails
      this.addFallbackMarkers();
    }
  }

  private addFallbackMarkers(): void {
    if (!this.map || !this.parcelDetails) return;

    // Default coordinates (Nairobi and Mombasa)
    const pickupCoords = { lat: -1.2921, lng: 36.8219 }; // Nairobi
    const deliveryCoords = { lat: -4.0435, lng: 39.6682 }; // Mombasa

    // Add pickup marker
    this.pickupMarker = this.mapService.createCustomMarker({
      location: pickupCoords,
      type: MapMarkerType.PICKUP,
      popupContent: `<strong>Pickup:</strong><br>${this.parcelDetails.pickupAddress}<br><strong>Parcel ID:</strong> #${this.parcelDetails.id}`
    });
    if (this.pickupMarker) {
      this.pickupMarker.addTo(this.map);
      this.markers.push(this.pickupMarker);
    }

    // Add delivery marker
    this.deliveryMarker = this.mapService.createCustomMarker({
      location: deliveryCoords,
      type: MapMarkerType.DELIVERY,
      popupContent: `<strong>Delivery:</strong><br>${this.parcelDetails.deliveryAddress}<br><strong>Parcel ID:</strong> #${this.parcelDetails.id}`
    });
    if (this.deliveryMarker) {
      this.deliveryMarker.addTo(this.map);
      this.markers.push(this.deliveryMarker);
    }
  }

  private async addDriverMarkers(): Promise<void> {
    // Add driver markers to the map
    if (!this.map || !this.availableDrivers.length) return;

    try {
      // Clear existing driver markers
      this.driverMarkers.forEach(marker => {
        if (this.map) {
          this.map.removeLayer(marker);
        }
      });
      this.driverMarkers = [];

      // Add markers for each available driver
      for (const driver of this.availableDrivers) {
        if (driver.currentLat && driver.currentLng) {
          const driverMarker = this.mapService.createCustomMarker({
            location: { lat: driver.currentLat, lng: driver.currentLng },
            type: MapMarkerType.DRIVER,
            popupContent: `
              <strong>Driver: ${driver.name}</strong><br>
              <strong>Vehicle:</strong> ${driver.vehicleType || 'N/A'} - ${driver.vehicleNumber || 'N/A'}<br>
              <strong>Rating:</strong> ${(driver.averageRating || 0).toFixed(1)} ★ (${driver.totalRatings || 0})<br>
              <strong>Phone:</strong> ${driver.phone || 'N/A'}<br>
              <strong>Completed Deliveries:</strong> ${driver.completedDeliveries || 0}
            `
          });
          
          if (driverMarker) {
            driverMarker.addTo(this.map);
            this.driverMarkers.push(driverMarker);
            this.markers.push(driverMarker);
          }
        }
      }

      console.log(`Added ${this.driverMarkers.length} driver markers to the map`);
    } catch (error) {
      console.error('Error adding driver markers:', error);
    }
  }

  private async drawRoute(): Promise<void> {
    if (!this.map || !this.pickupMarker || !this.deliveryMarker) return;

    try {
      const pickupPos = this.pickupMarker.getLatLng();
      const deliveryPos = this.deliveryMarker.getLatLng();

      const waypoints = [
        { lat: pickupPos.lat, lng: pickupPos.lng },
        { lat: deliveryPos.lat, lng: deliveryPos.lng }
      ];

      // Create route line
      this.routeLine = this.mapService.createRoute(this.map, waypoints, {
        color: '#007bff',
        weight: 4
      });

      // Calculate and display route info
      const routeInfo = this.mapService.calculateRouteInfo(waypoints);
      console.log('Route distance:', routeInfo.distance, 'km');
      console.log('Estimated time:', routeInfo.estimatedTime, 'hours');

    } catch (error) {
      console.error('Error drawing route:', error);
    }
  }

  private fitMapToBounds(): void {
    if (!this.map || this.markers.length === 0) return;

    try {
      // Create bounds from all markers
      const bounds = L.latLngBounds(
        this.markers.map(marker => marker.getLatLng())
      );
      
      // Fit map to bounds with padding
      this.map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 15
      });
      
      console.log(`Fitted map to ${this.markers.length} markers`);
    } catch (error) {
      console.error('Error fitting map to markers:', error);
    }
  }

  public fitMapToMarkers(): void {
    this.fitMapToBounds();
    this.toastService.showSuccess('Map adjusted to show all locations');
  }

  public refreshMap(): void {
    if (this.map) {
      this.map.invalidateSize();
      this.fitMapToBounds();
      this.toastService.showSuccess('Map refreshed');
    }
  }

  // Update map when parcel details change
  private async updateMap(): Promise<void> {
    if (!this.map) return;

    // Clear existing markers and route
    this.mapService.clearMarkers(this.map, this.markers);
    this.markers = [];
    this.pickupMarker = null;
    this.deliveryMarker = null;
    this.driverMarkers = [];

    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    // Re-add markers and route
    await this.addLocationMarkers();
    await this.addDriverMarkers();
    await this.drawRoute();
    this.fitMapToBounds();
  }

  ngOnDestroy(): void {
    // Clean up map resources
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
    this.driverMarkers = [];
    this.pickupMarker = null;
    this.deliveryMarker = null;
    this.routeLine = null;
    
    // Remove window resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
    
    // Clear temporary parcel details
    this.parcelsService.clearTempParcelDetails();
  }

  private handleResize(): void {
    // Debounce resize events
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        console.log('🔄 Map resized');
      }
    }, 250);
  }
} 