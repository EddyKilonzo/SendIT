import { Component, OnInit } from '@angular/core';
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

    // Initialize delivery instructions with proper workflow
    this.deliveryInstructions = [
      {
        text: `Inspect parcel at pickup location`,
        completed: false
      },
      {
        text: `Pickup from: ${this.parcel.pickupAddress}`,
        completed: false
      },
      {
        text: `Deliver to: ${this.parcel.deliveryAddress}`,
        completed: false
      },
      {
        text: `Mark delivery as completed`,
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
        description: `<strong>Your Current Location</strong><br>Driver Position`,
        address: 'Current Location'
      });

      // Geocode pickup address
      const pickupResult = await this.mapService.geocodeAddress(this.parcel.pickupAddress);
      if (pickupResult.success && pickupResult.location) {
        this.mapMarkers.push({
          ...pickupResult.location,
          description: `<strong>Pickup Location</strong><br>${this.parcel.pickupAddress}`,
          address: this.parcel.pickupAddress
        });
      }

      // Geocode delivery address
      const deliveryResult = await this.mapService.geocodeAddress(this.parcel.deliveryAddress);
      if (deliveryResult.success && deliveryResult.location) {
        this.mapMarkers.push({
          ...deliveryResult.location,
          description: `<strong>Delivery Location</strong><br>${this.parcel.deliveryAddress}`,
          address: this.parcel.deliveryAddress
        });
      }

      // Update map center to show all markers
      this.updateMapCenter();
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
      // After inspection, status remains pending
      this.parcel.status = 'Pending';
    } else if (completedCount === 2) {
      // After pickup, status changes to In Transit
      this.parcel.status = 'In Transit';
    } else if (completedCount === 3) {
      // After delivery, status remains In Transit until marked complete
      this.parcel.status = 'In Transit';
    } else if (completedCount === 4) {
      // After marking as completed, status changes to Delivered
      this.parcel.status = 'Delivered';
    }
  }

  canMarkAsCompleted(): boolean {
    // Can only mark as completed if all instructions except the last one are done
    const completedCount = this.deliveryInstructions.filter(instruction => instruction.completed).length;
    return completedCount === 3; // All instructions except "Mark delivery as completed"
  }

  toggleView() {
    this.showMapView = !this.showMapView;
  }

  onMapReady(map: L.Map): void {
    console.log('Map is ready for driver parcel details');
    
    // Fit map to show all markers after a short delay to ensure they're loaded
    setTimeout(() => {
      if (this.mapMarkers.length > 1) {
        // Fit map to show all markers with some padding
        const bounds = L.latLngBounds(
          this.mapMarkers.map(marker => [marker.lat, marker.lng])
        );
        map.fitBounds(bounds, { padding: [20, 20] });
      }
    }, 500);
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
    if (this.mapMarkers.length > 1) {
      // This will be called by the map component's fitToMarkers method
      console.log('Fitting map to show all markers');
    }
  }

  refreshMapMarkers(): void {
    // Re-setup map markers (useful for refreshing location data)
    this.setupMapMarkers();
  }

  markAsCompleted() {
    if (this.parcel && this.canMarkAsCompleted()) {
      // Complete the last instruction
      this.deliveryInstructions[3].completed = true;
      this.parcel.status = 'Delivered';
      console.log('Parcel marked as completed:', this.parcel.parcelId);
      // TODO: Call service to update parcel status
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