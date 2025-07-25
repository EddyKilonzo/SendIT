import { Component, OnInit, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/toast/toast.service';
import { MapService } from '../../../../services/map.service';
import { MapMarkerType } from '../../../../types/map.types';
import { SidebarComponent } from '../../../shared/sidebar/sidebar';
import * as L from 'leaflet';

interface Driver {
  id: string;
  name: string;
  rating: number;
  deliveries: number;
  vehicleType: string;
  availability: string;
  isSelected: boolean;
}

interface ParcelDetails {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  price: number;
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
  availableDrivers: Driver[] = [];
  filteredDrivers: Driver[] = [];
  selectedDriver: Driver | null = null;

  // Filter options
  vehicleTypes = ['All', 'Car', 'Van', 'Motorcycle', 'Truck'];
  availabilityOptions = ['All', 'Available', 'Busy', 'Offline'];
  ratingOptions = ['All', '4.5+', '4.0+', '3.5+'];

  // Map properties
  private map: L.Map | null = null;
  private pickupMarker: L.Marker | null = null;
  private deliveryMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private markers: L.Marker[] = [];

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private router: Router,
    private mapService: MapService
  ) {
    this.assignForm = this.fb.group({
      vehicleType: ['All'],
      availability: ['All'],
      rating: ['All']
    });
  }

  ngOnInit() {
    this.loadAvailableDrivers();
    this.setupFilterListeners();
    
    // Check if parcel details were passed from navigation
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state.parcelDetails) {
        this.parcelDetails = state.parcelDetails;
        console.log('Parcel details received:', this.parcelDetails);
      }
    }
    
    // If no parcel details were passed, use a placeholder parcel
    if (!this.parcelDetails) {
      this.parcelDetails = {
        id: 'PLACEHOLDER123',
        pickupAddress: '123 Main Street, Nairobi CBD, Kenya',
        deliveryAddress: '456 Mombasa Road, Mombasa, Kenya',
        weight: 5.5,
        price: 550.00
      };
      console.log('Using placeholder parcel details:', this.parcelDetails);
    }

    // Initialize map after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  loadAvailableDrivers() {
    // Mock data - in real app, this would come from a service
    this.availableDrivers = [
      {
        id: '1',
        name: 'Ethan Carter',
        rating: 4.8,
        deliveries: 150,
        vehicleType: 'Van',
        availability: 'Available',
        isSelected: false
      },
      {
        id: '2',
        name: 'Liam Harper',
        rating: 4.5,
        deliveries: 200,
        vehicleType: 'Motorcycle',
        availability: 'Busy',
        isSelected: false
      },
      {
        id: '3',
        name: 'Noah Bennett',
        rating: 4.9,
        deliveries: 120,
        vehicleType: 'Car',
        availability: 'Available',
        isSelected: false
      },
      {
        id: '4',
        name: 'Oliver Wilson',
        rating: 4.7,
        deliveries: 180,
        vehicleType: 'Truck',
        availability: 'Available',
        isSelected: false
      },
      {
        id: '5',
        name: 'William Davis',
        rating: 4.3,
        deliveries: 95,
        vehicleType: 'Car',
        availability: 'Offline',
        isSelected: false
      }
    ];
    this.filteredDrivers = [...this.availableDrivers];
  }

  setupFilterListeners() {
    this.assignForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters() {
    const { vehicleType, availability, rating } = this.assignForm.value;
    
    this.filteredDrivers = this.availableDrivers.filter(driver => {
      // Vehicle type filter
      if (vehicleType !== 'All' && driver.vehicleType !== vehicleType) {
        return false;
      }
      
      // Availability filter
      if (availability !== 'All' && driver.availability !== availability) {
        return false;
      }
      
      // Rating filter
      if (rating !== 'All') {
        const minRating = parseFloat(rating.replace('+', ''));
        if (driver.rating < minRating) {
          return false;
        }
      }
      
      return true;
    });
  }

  selectDriver(driver: Driver) {
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
      this.toastService.showError('No parcel details available.');
      return;
    }

    // Emit the assignment event
    this.driverAssigned.emit({
      parcelId: this.parcelDetails.id,
      driverId: this.selectedDriver.id
    });

    this.toastService.showSuccess(`Driver ${this.selectedDriver.name} assigned to parcel #${this.parcelDetails.id}`);
    
    // Redirect to a parcel that already has a driver assigned
    setTimeout(() => {
      // Redirect to a parcel that already has a driver (e.g., #12346 which has John Smith)
      this.router.navigate(['/admin-parcel-details', '#12346'], {
        state: { 
          assignedDriverId: this.selectedDriver?.id,
          newlyAssigned: true
        }
      });
    }, 1000); // Wait 1 second for the success message to be visible
  }

  getDriverStatusClass(availability: string): string {
    switch (availability) {
      case 'Available':
        return 'status-available';
      case 'Busy':
        return 'status-busy';
      case 'Offline':
        return 'status-offline';
      default:
        return '';
    }
  }

  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
  }

  goBack() {
    this.router.navigate(['/admin-manage-parcels']);
  }

  // Map Methods
  private async initializeMap(): Promise<void> {
    try {
      // Create map instance
      this.map = this.mapService.createMap('assign-driver-map');
      
      // Add markers for pickup and delivery locations
      await this.addLocationMarkers();
      
      // Draw route between pickup and delivery
      await this.drawRoute();
      
      // Fit map to show all markers
      this.fitMapToMarkers();
      
    } catch (error) {
      console.error('Error initializing map:', error);
      this.toastService.showError('Failed to load map. Please refresh the page.');
    }
  }

  private async addLocationMarkers(): Promise<void> {
    if (!this.map || !this.parcelDetails) return;

    try {
      // Geocode pickup location
      const pickupResult = await this.mapService.geocodeAddress(this.parcelDetails.pickupAddress);
      
      // Geocode delivery location
      const deliveryResult = await this.mapService.geocodeAddress(this.parcelDetails.deliveryAddress);

      // Add pickup marker if geocoding was successful
      if (pickupResult.success && pickupResult.location) {
        this.pickupMarker = this.mapService.createCustomMarker({
          location: pickupResult.location,
          type: MapMarkerType.PICKUP,
          popupContent: `<strong>Pickup:</strong><br>${this.parcelDetails.pickupAddress}<br><strong>Parcel ID:</strong> #${this.parcelDetails.id}`
        });
                if (this.pickupMarker) {
            this.pickupMarker.addTo(this.map);
            this.markers.push(this.pickupMarker);
          }
        }

      // Add delivery marker if geocoding was successful
      if (deliveryResult.success && deliveryResult.location) {
        this.deliveryMarker = this.mapService.createCustomMarker({
          location: deliveryResult.location,
          type: MapMarkerType.DELIVERY,
          popupContent: `<strong>Delivery:</strong><br>${this.parcelDetails.deliveryAddress}<br><strong>Parcel ID:</strong> #${this.parcelDetails.id}`
        });
        if (this.deliveryMarker) {
          this.deliveryMarker.addTo(this.map);
          this.markers.push(this.deliveryMarker);
        }
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

  private fitMapToMarkers(): void {
    if (!this.map || this.markers.length === 0) return;

    try {
      this.mapService.fitMapToMarkers(this.map, this.markers);
    } catch (error) {
      console.error('Error fitting map to markers:', error);
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

    if (this.routeLine) {
      this.map.removeLayer(this.routeLine);
      this.routeLine = null;
    }

    // Re-add markers and route
    await this.addLocationMarkers();
    await this.drawRoute();
    this.fitMapToMarkers();
  }

  ngOnDestroy(): void {
    // Clean up map resources
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
    this.pickupMarker = null;
    this.deliveryMarker = null;
    this.routeLine = null;
  }
} 