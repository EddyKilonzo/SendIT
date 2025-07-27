import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MapComponent } from '../../shared/map/map.component';
import { MapService } from '../../../services/map.service';
import { MapLocation, MapCoordinates, MapError } from '../../../types/map.types';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import * as L from 'leaflet';

interface Parcel {
  id: string;
  parcelId: string;
  pickupAddress: string;
  deliveryAddress: string;
  scheduledPickupTime: string;
  scheduledDeliveryTime: string;
  recipientName: string;
  recipientPhone: string;
  specialInstructions: string;
  status: string;
  weight?: string;
  customerName?: string;
}

interface DeliveryInstruction {
  text: string;
  completed: boolean;
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
  userRole: string = 'DRIVER';
  showMapView: boolean = false;
  
  // Map-related properties
  mapMarkers: MapLocation[] = [];
  mapCenter: MapCoordinates = { lat: -1.2921, lng: 36.8219 }; // Nairobi
  currentLocation: MapLocation | null = null;

  constructor(
    private route: ActivatedRoute,
    private mapService: MapService
  ) {}

  ngOnInit() {
    // Get parcel ID from route parameters
    this.route.params.subscribe(params => {
      const parcelId = params['id'];
      this.loadParcelDetails(parcelId);
    });
  }

  loadParcelDetails(parcelId: string) {
    // Sample parcel data - in real app, this would come from a service
    this.parcel = {
      id: parcelId,
      parcelId: '#123456',
      pickupAddress: '123 Maple Street, Anytown, USA',
      deliveryAddress: '456 Oak Avenue, Anytown, USA',
      scheduledPickupTime: '2024-03-15 10:00 AM',
      scheduledDeliveryTime: '2024-03-15 12:00 PM',
      recipientName: 'Liam Carter',
      recipientPhone: '+1-555-123-4567',
      specialInstructions: 'Handle with care',
      status: 'Pending',
      weight: '2.5 kg',
      customerName: 'John Smith'
    };

    // Initialize delivery instructions with simplified workflow
    this.deliveryInstructions = [
      {
        text: `Pick up from: ${this.parcel.pickupAddress}`,
        completed: false
      },
      {
        text: `Deliver to: ${this.parcel.deliveryAddress}`,
        completed: false
      }
    ];

    // Setup map markers
    this.setupMapMarkers();
  }

  private async setupMapMarkers(): Promise<void> {
    if (!this.parcel) return;

    try {
      this.mapMarkers = [];

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
        description: `<strong>Your Current Location</strong><br>Driver Position<br><strong>Parcel ID:</strong> ${this.parcel.parcelId}`,
        address: 'Current Location'
      });

      // Geocode pickup address
      const pickupResult = await this.mapService.geocodeAddress(this.parcel.pickupAddress);
      if (pickupResult.success && pickupResult.location) {
        this.mapMarkers.push({
          ...pickupResult.location,
          description: `<strong>Pickup Location</strong><br>${this.parcel.pickupAddress}<br><strong>Recipient:</strong> ${this.parcel.recipientName}<br><strong>Phone:</strong> ${this.parcel.recipientPhone}`,
          address: this.parcel.pickupAddress
        });
      }

      // Geocode delivery address
      const deliveryResult = await this.mapService.geocodeAddress(this.parcel.deliveryAddress);
      if (deliveryResult.success && deliveryResult.location) {
        this.mapMarkers.push({
          ...deliveryResult.location,
          description: `<strong>Delivery Location</strong><br>${this.parcel.deliveryAddress}<br><strong>Recipient:</strong> ${this.parcel.recipientName}<br><strong>Phone:</strong> ${this.parcel.recipientPhone}<br><strong>Instructions:</strong> ${this.parcel.specialInstructions}`,
          address: this.parcel.deliveryAddress
        });
      }

      // Update map center to show all markers
      this.updateMapCenter();
      
      console.log(`Loaded ${this.mapMarkers.length} markers for driver parcel details`);
    } catch (error) {
      console.error('Error setting up map markers:', error);
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

  toggleInstruction(index: number) {
    if (!this.canCompleteInstruction(index)) {
      return;
    }

    this.deliveryInstructions[index].completed = !this.deliveryInstructions[index].completed;
    
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
    
    if (completedCount === 0) {
      this.parcel.status = 'Pending';
    } else if (completedCount === 1) {
      // After pickup, status changes to In Transit
      this.parcel.status = 'In Transit';
    } else if (completedCount === 2) {
      // After delivery, status changes to Delivered
      this.parcel.status = 'Delivered';
    }
  }

  canMarkAsCompleted(): boolean {
    // Can mark as completed after delivery (both instructions)
    const completedCount = this.deliveryInstructions.filter(instruction => instruction.completed).length;
    return completedCount === 2; // Can complete after both pickup and delivery
  }

  toggleView() {
    this.showMapView = !this.showMapView;
  }

  onMapReady(map: L.Map): void {
    console.log('Map is ready for driver parcel details');
    
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
  }

  onMapClick(coordinates: MapCoordinates): void {
    console.log('Map clicked at:', coordinates);
  }

  onMapError(error: MapError): void {
    console.error('Map error:', error);
  }

  onRouteUpdated(routeInfo: { distance: number; estimatedTime: number }): void {
    console.log('Route updated:', routeInfo);
    // You can display route information here if needed
  }

  fitMapToMarkers(): void {
    console.log('fitMapToMarkers called - mapComponent:', !!this.mapComponent, 'markers count:', this.mapMarkers.length, 'showMapView:', this.showMapView);
    
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

  markAsCompleted() {
    if (this.parcel && this.canMarkAsCompleted()) {
      // Mark delivery as completed - this would trigger customer notification
      this.parcel.status = 'Delivered';
      console.log('Parcel marked as delivered:', this.parcel.parcelId);
      // TODO: Call service to update parcel status to "Delivered"
      // Customer will then mark as "Completed" from their side to enable review
    }
  }



  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'in transit':
        return 'status-in-transit';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }
} 