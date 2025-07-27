import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/toast/toast.service';
import { MapService } from '../../../../services/map.service';
import { MapMarkerType } from '../../../../types/map.types';
import { SidebarComponent } from '../../../shared/sidebar/sidebar';
import { ParcelsService } from '../../../../services/parcels.service';
import * as L from 'leaflet';

interface OrderDetails {
  senderName: string;
  senderContact: string;
  recipientName: string;
  recipientContact: string;
  pickupLocation: string;
  destination: string;
  totalPrice: number;
  parcelWeight: number;
  pricePerKg: number;
  parcelId?: string;
  senderAddress?: string;
  senderEmail?: string;
  recipientAddress?: string;
  recipientEmail?: string;
}

@Component({
  selector: 'app-order-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './order-confirmation.html',
  styleUrls: ['./order-confirmation.css']
})
export class OrderConfirmation implements OnInit, OnDestroy {
  orderDetails: OrderDetails = {
    senderName: '',
    senderContact: '',
    recipientName: '',
    recipientContact: '',
    pickupLocation: '',
    destination: '',
    totalPrice: 0,
    parcelWeight: 0,
    pricePerKg: 100
  };

  editForm: FormGroup;
  isEditMode: boolean = false;
  originalOrderDetails: OrderDetails | null = null;
  expectedDeliveryDate: string = '';
  parcelDetails: any = null;
  
  // Map properties
  private map: L.Map | null = null;
  private pickupMarker: L.Marker | null = null;
  private deliveryMarker: L.Marker | null = null;
  private routeLine: L.Polyline | null = null;
  private markers: L.Marker[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private fb: FormBuilder,
    private mapService: MapService,
    private parcelsService: ParcelsService
  ) {
    this.editForm = this.fb.group({
      senderName: ['', [Validators.required, Validators.minLength(2)]],
      senderContact: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      recipientName: ['', [Validators.required, Validators.minLength(2)]],
      recipientContact: ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-\(\)]+$/)]],
      pickupLocation: ['', [Validators.required, Validators.minLength(3)]],
      destination: ['', [Validators.required, Validators.minLength(3)]],
      parcelWeight: ['', [Validators.required, Validators.min(0.1), Validators.max(1000)]],
      pricePerKg: [100, [Validators.required, Validators.min(0.01)]]
    });

    // Listen to form changes to recalculate total price
    this.editForm.get('parcelWeight')?.valueChanges.subscribe(weight => {
      this.calculateTotalPrice(weight);
    });

    this.editForm.get('pricePerKg')?.valueChanges.subscribe(price => {
      const weight = this.editForm.get('parcelWeight')?.value;
      this.calculateTotalPrice(weight, price);
    });
  }

  ngOnInit() {
    // Get order details and parcel details from route state or query params
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.orderDetails = navigation.extras.state['orderDetails'];
      this.parcelDetails = navigation.extras.state['parcelDetails'];
      console.log('Order details from navigation state:', this.orderDetails);
      console.log('Parcel details from navigation state:', this.parcelDetails);
    }

    // Set expected delivery date (3 days from now)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);
    this.expectedDeliveryDate = deliveryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // If no order details in state, try to get from query params
    if (!this.orderDetails.senderName) {
      this.route.queryParams.subscribe(params => {
        if (params['orderData']) {
          try {
            this.orderDetails = JSON.parse(params['orderData']);
            console.log('Order details from query params:', this.orderDetails);
          } catch (e) {
            console.error('Error parsing order data:', e);
          }
        }
      });
    }

    // If still no data, use sample data for testing
    if (!this.orderDetails.senderName) {
      this.orderDetails = {
        senderName: 'John Doe',
        senderContact: '+254712345678',
        recipientName: 'Jane Smith',
        recipientContact: '+254798765432',
        pickupLocation: 'Nairobi CBD, Kenya',
        destination: 'Mombasa, Kenya',
        totalPrice: 2500,
        parcelWeight: 2.5,
        pricePerKg: 100,
        senderAddress: '123 Main Street, Nairobi',
        senderEmail: 'john.doe@email.com',
        recipientAddress: '456 Beach Road, Mombasa',
        recipientEmail: 'jane.smith@email.com'
      };
      console.log('Using sample order details:', this.orderDetails);
    }

    // Initialize the edit form with current order details
    this.populateEditForm();
    
    // Initialize map after a short delay to ensure DOM is ready
    setTimeout(() => {
      this.initializeMap();
    }, 100);
  }

  populateEditForm() {
    console.log('Populating edit form with order details:', this.orderDetails);
    
    // Ensure we have valid data before populating
    const formData = {
      senderName: this.orderDetails.senderName || '',
      senderContact: this.orderDetails.senderContact || '',
      recipientName: this.orderDetails.recipientName || '',
      recipientContact: this.orderDetails.recipientContact || '',
      pickupLocation: this.orderDetails.pickupLocation || '',
      destination: this.orderDetails.destination || '',
      parcelWeight: this.orderDetails.parcelWeight || 0,
      pricePerKg: this.orderDetails.pricePerKg || 100
    };

    console.log('Form data to populate:', formData);
    
    // Use setValue instead of patchValue for more reliable population
    try {
      this.editForm.setValue(formData);
      console.log('Form populated successfully');
    } catch (error) {
      console.error('Error populating form:', error);
      // Fallback to patchValue if setValue fails
      this.editForm.patchValue(formData);
    }
    
    // Trigger price calculation after populating
    setTimeout(() => {
      this.calculateTotalPrice(formData.parcelWeight, formData.pricePerKg);
      console.log('Price calculation triggered');
    }, 100);
  }

  toggleEditMode() {
    if (!this.isEditMode) {
      // Entering edit mode
      this.originalOrderDetails = { ...this.orderDetails };
      console.log('Original order details saved:', this.originalOrderDetails);
      
      // Ensure form is populated with current data
      this.populateEditForm();
      
      this.isEditMode = true;
      this.toastService.showInfo('Edit mode activated. All fields are pre-filled with current data. Make your changes and click Save.');
    }
  }

  saveChanges() {
    if (this.editForm.valid) {
      const formData = this.editForm.value;
      formData.totalPrice = this.calculateTotalPrice(formData.parcelWeight, formData.pricePerKg);
      
      // Update the order details
      this.orderDetails = { ...this.orderDetails, ...formData };
      
      this.isEditMode = false;
      this.toastService.showSuccess('Order updated successfully!');
      
      console.log('Updated order details:', this.orderDetails);
    } else {
      this.markFormGroupTouched();
      this.toastService.showError('Please fill in all required fields correctly.');
    }
  }

  cancelEdit() {
    // Restore original order details
    if (this.originalOrderDetails) {
      this.orderDetails = { ...this.originalOrderDetails };
      console.log('Restored original order details:', this.orderDetails);
    }
    
    this.isEditMode = false;
    this.toastService.showInfo('Edit cancelled. All changes have been discarded.');
  }

  calculateTotalPrice(weight: number, pricePerKg?: number): number {
    const currentPricePerKg = pricePerKg || this.editForm.get('pricePerKg')?.value || 100;
    if (weight && weight > 0 && currentPricePerKg && currentPricePerKg > 0) {
      return weight * currentPricePerKg;
    }
    return 0;
  }

  getFormattedTotalPrice(): string {
    const weight = this.editForm.get('parcelWeight')?.value || 0;
    const pricePerKg = this.editForm.get('pricePerKg')?.value || 100;
    const total = this.calculateTotalPrice(weight, pricePerKg);
    return total > 0 ? `KSH ${total.toFixed(2)}` : 'KSH 0.00';
  }

  getFormattedPricePerKg(): string {
    const price = this.editForm.get('pricePerKg')?.value || 100;
    return `KSH ${price.toFixed(2)}`;
  }

  private markFormGroupTouched() {
    Object.keys(this.editForm.controls).forEach(key => {
      const control = this.editForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.editForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        return 'Please enter a valid phone number';
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must be less than ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      senderName: 'Sender name',
      senderContact: 'Sender contact',
      recipientName: 'Recipient name',
      recipientContact: 'Recipient contact',
      pickupLocation: 'Pickup location',
      destination: 'Destination',
      parcelWeight: 'Parcel weight',
      pricePerKg: 'Price per kilogram'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.editForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  assignDriver() {
    console.log('🚀 OrderConfirmation assignDriver called');
    console.log('📦 Current parcel details:', this.parcelDetails);
    console.log('📋 Current order details:', this.orderDetails);
    
    // Use the parcel details that were passed from create-delivery
    if (this.parcelDetails) {
      console.log('✅ Using existing parcel details');
      // Store parcel details in service as backup
      this.parcelsService.setTempParcelDetails(this.parcelDetails, false);
      
      // Navigate to driver assignment page with parcel details
      this.router.navigate(['/admin-assign-driver'], {
        state: { parcelDetails: this.parcelDetails }
      });
    } else {
      console.log('⚠️ No parcel details, creating from order details');
      // Fallback: create parcel details from order details
      const parcelDetails = {
        id: this.orderDetails.parcelId || this.generateParcelId(),
        trackingNumber: this.orderDetails.parcelId || this.generateParcelId(),
        pickupAddress: this.orderDetails.pickupLocation,
        deliveryAddress: this.orderDetails.destination,
        weight: this.orderDetails.parcelWeight,
        price: this.orderDetails.totalPrice,
        senderName: this.orderDetails.senderName,
        recipientName: this.orderDetails.recipientName
      };
      
      console.log('📦 Created parcel details from order:', parcelDetails);
      
      // Store parcel details in service as backup
      this.parcelsService.setTempParcelDetails(parcelDetails, false);
      
      // Navigate to driver assignment page with parcel details
      this.router.navigate(['/admin-assign-driver'], {
        state: { parcelDetails: parcelDetails }
      });
    }
  }

  generateParcelId(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  goToDashboard() {
    this.router.navigate(['/admin-dashboard']);
  }

  goToManageParcels() {
    this.router.navigate(['/admin-manage-parcels']);
  }

  goToUsers() {
    this.router.navigate(['/admin-users']);
  }

  // Map Methods
  private async initializeMap(): Promise<void> {
    try {
      // Create map instance
      this.map = this.mapService.createMap('order-confirmation-map');
      
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
    if (!this.map) return;

    try {
      // Geocode pickup location
      const pickupResult = await this.mapService.geocodeAddress(this.orderDetails.pickupLocation);
      
      // Geocode delivery location
      const deliveryResult = await this.mapService.geocodeAddress(this.orderDetails.destination);

      // Add pickup marker if geocoding was successful
      if (pickupResult.success && pickupResult.location) {
        this.pickupMarker = this.mapService.createCustomMarker({
          location: pickupResult.location,
          type: MapMarkerType.PICKUP,
          popupContent: `<strong>Pickup:</strong><br>${this.orderDetails.pickupLocation}<br><strong>Sender:</strong> ${this.orderDetails.senderName}`
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
          popupContent: `<strong>Delivery:</strong><br>${this.orderDetails.destination}<br><strong>Recipient:</strong> ${this.orderDetails.recipientName}`
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
    if (!this.map) return;

    // Default coordinates (Nairobi and Mombasa)
    const pickupCoords = { lat: -1.2921, lng: 36.8219 }; // Nairobi
    const deliveryCoords = { lat: -4.0435, lng: 39.6682 }; // Mombasa

    // Add pickup marker
    this.pickupMarker = this.mapService.createCustomMarker({
      location: pickupCoords,
      type: MapMarkerType.PICKUP,
      popupContent: `<strong>Pickup:</strong><br>${this.orderDetails.pickupLocation}<br><strong>Sender:</strong> ${this.orderDetails.senderName}`
    });
    if (this.pickupMarker) {
      this.pickupMarker.addTo(this.map);
      this.markers.push(this.pickupMarker);
    }

    // Add delivery marker
    this.deliveryMarker = this.mapService.createCustomMarker({
      location: deliveryCoords,
      type: MapMarkerType.DELIVERY,
      popupContent: `<strong>Delivery:</strong><br>${this.orderDetails.destination}<br><strong>Recipient:</strong> ${this.orderDetails.recipientName}`
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

  // Update map when order details change
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
