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
    console.log('🔄 OrderConfirmation ngOnInit started');
    
    // Get order details and parcel details from router state
    const navigation = this.router.getCurrentNavigation();
    let state = null;
    
    if (navigation?.extras.state) {
      state = navigation.extras.state;
      console.log('📦 Router state received:', state);
    } else {
      // Try to get from history state as fallback
      const historyState = history.state;
      if (historyState && Object.keys(historyState).length > 0) {
        state = historyState;
        console.log('📦 History state received:', state);
      } else {
        console.warn('⚠️ No router or history state found');
      }
    }
    
    if (state) {
      // Handle the data structure passed from create delivery
      if (state['orderDetails']) {
        console.log('📋 Raw order details from state:', state['orderDetails']);
        this.orderDetails = {
          senderName: state['orderDetails'].senderName || '',
          senderContact: state['orderDetails'].senderContact || '',
          recipientName: state['orderDetails'].recipientName || '',
          recipientContact: state['orderDetails'].recipientContact || '',
          pickupLocation: state['orderDetails'].pickupLocation || '',
          destination: state['orderDetails'].destination || '',
          totalPrice: state['orderDetails'].totalPrice || this.calculateTotalPrice(state['orderDetails'].parcelWeight, state['orderDetails'].pricePerKg),
          parcelWeight: state['orderDetails'].parcelWeight || 0,
          pricePerKg: state['orderDetails'].pricePerKg || 100,
          senderAddress: state['orderDetails'].senderAddress || '',
          senderEmail: state['orderDetails'].senderEmail || '',
          recipientAddress: state['orderDetails'].recipientAddress || '',
          recipientEmail: state['orderDetails'].recipientEmail || ''
        };
        console.log('✅ Order details processed:', this.orderDetails);
      } else {
        console.warn('⚠️ No orderDetails found in state');
      }
      
      if (state['parcelDetails']) {
        this.parcelDetails = state['parcelDetails'];
        console.log('📦 Parcel details received:', this.parcelDetails);
      } else {
        console.warn('⚠️ No parcelDetails found in state');
      }
      
      if (state['createdParcel']) {
        // Update order details with the created parcel info
        this.orderDetails.parcelId = state['createdParcel'].id;
        console.log('🎯 Created parcel info:', state['createdParcel']);
      } else {
        console.warn('⚠️ No createdParcel found in state');
      }
    }

    // Set expected delivery date (3 days from now)
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 3);
    this.expectedDeliveryDate = deliveryDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // If no order details in state, try to get from parcels service
    if (!this.orderDetails.senderName) {
      console.log('🔍 Trying to get data from parcels service...');
      const tempParcelDetails = this.parcelsService.getTempParcelDetails();
      if (tempParcelDetails) {
        console.log('📦 Temp parcel details from service:', tempParcelDetails);
        // Create order details from parcel details
        this.orderDetails = {
          senderName: tempParcelDetails.senderName || '',
          senderContact: '', // Not available in parcel details
          recipientName: tempParcelDetails.recipientName || '',
          recipientContact: '', // Not available in parcel details
          pickupLocation: tempParcelDetails.pickupAddress || '',
          destination: tempParcelDetails.deliveryAddress || '',
          totalPrice: tempParcelDetails.price || 0,
          parcelWeight: tempParcelDetails.weight || 0,
          pricePerKg: 100, // Default value
          parcelId: tempParcelDetails.id || tempParcelDetails.trackingNumber || ''
        };
        this.parcelDetails = tempParcelDetails;
        console.log('✅ Order details created from service:', this.orderDetails);
      } else {
        console.warn('⚠️ No temp parcel details found in service');
      }
    }

    // If still no data, try to get from query params
    if (!this.orderDetails.senderName) {
      console.log('🔍 Trying to get data from query params...');
      this.route.queryParams.subscribe(params => {
        if (params['orderData']) {
          try {
            const orderData = JSON.parse(params['orderData']);
            console.log('📋 Order data from query params:', orderData);
            this.orderDetails = {
              senderName: orderData.senderName || '',
              senderContact: orderData.senderContact || '',
              recipientName: orderData.recipientName || '',
              recipientContact: orderData.recipientContact || '',
              pickupLocation: orderData.pickupLocation || '',
              destination: orderData.destination || '',
              totalPrice: orderData.totalPrice || 0,
              parcelWeight: orderData.parcelWeight || 0,
              pricePerKg: orderData.pricePerKg || 100,
              senderAddress: orderData.senderAddress || '',
              senderEmail: orderData.senderEmail || '',
              recipientAddress: orderData.recipientAddress || '',
              recipientEmail: orderData.recipientEmail || ''
            };
            console.log('✅ Order details from query params processed:', this.orderDetails);
          } catch (e) {
            console.error('❌ Error parsing order data:', e);
          }
        } else {
          console.warn('⚠️ No orderData found in query params');
        }
      });
    }

    // If still no data, redirect back to create delivery page
    if (!this.orderDetails.senderName) {
      console.warn('❌ No order details found, redirecting to create delivery page');
      this.toastService.showError('No order details found. Please create a new order.');
      this.router.navigate(['/admin-create-delivery']);
      return;
    }

    console.log('✅ Order details are available, proceeding with initialization');
    console.log('📋 Final order details:', this.orderDetails);

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
      const weightPrice = weight * currentPricePerKg;
      const deliveryFee = 200; // Fixed delivery fee
      return weightPrice + deliveryFee;
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

  calculateWeightPrice(): number {
    const weight = this.editForm.get('parcelWeight')?.value || 0;
    const pricePerKg = this.editForm.get('pricePerKg')?.value || 100;
    return weight * pricePerKg;
  }

  getFormattedWeightPrice(): string {
    const weightPrice = this.calculateWeightPrice();
    return weightPrice > 0 ? `KSH ${weightPrice.toFixed(2)}` : 'KSH 0.00';
  }

  getFormattedDeliveryFee(): string {
    return 'KSH 200.00';
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
