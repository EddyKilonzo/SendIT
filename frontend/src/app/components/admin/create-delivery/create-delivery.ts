import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastService } from '../../shared/toast/toast.service';
import { MapComponent } from '../../shared/map/map.component';
import { MapService } from '../../../services/map.service';
import { MapLocation, MapCoordinates, MapError, AddressSuggestion } from '../../../types/map.types';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Custom validators
function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  // Remove all non-digit characters
  const digitsOnly = control.value.replace(/\D/g, '');
  
  if (digitsOnly.length !== 10) {
    return { phoneNumber: { message: 'Phone number must be at least 10 digits' } };
  }
  
  return null;
}

function emailValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailPattern.test(control.value)) {
    return { emailFormat: { message: 'Please enter a valid email address' } };
  }
  
  return null;
}

// Cross-field validator to check if sender and recipient details don't match
function senderRecipientValidator(group: AbstractControl): ValidationErrors | null {
  const senderEmail = group.get('senderEmail')?.value;
  const recipientEmail = group.get('recipientEmail')?.value;
  const senderContact = group.get('senderContact')?.value;
  const recipientContact = group.get('recipientContact')?.value;
  const senderAddress = group.get('senderAddress')?.value;
  const recipientAddress = group.get('recipientAddress')?.value;
  const pickupLocation = group.get('pickupLocation')?.value;
  const destination = group.get('destination')?.value;
  
  const errors: any = {};
  
  // Check if emails match
  if (senderEmail && recipientEmail && senderEmail.toLowerCase() === recipientEmail.toLowerCase()) {
    errors.senderRecipientEmailMatch = { message: 'Sender and recipient emails cannot be the same' };
  }
  
  // Check if contacts match (compare only digits)
  if (senderContact && recipientContact) {
    const senderDigits = senderContact.replace(/\D/g, '');
    const recipientDigits = recipientContact.replace(/\D/g, '');
    
    if (senderDigits === recipientDigits) {
      errors.senderRecipientContactMatch = { message: 'Sender and recipient contact numbers cannot be the same' };
    }
  }
  
  // Check if sender and recipient addresses match
  if (senderAddress && recipientAddress) {
    const normalizedSenderAddress = senderAddress.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedRecipientAddress = recipientAddress.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (normalizedSenderAddress === normalizedRecipientAddress) {
      errors.senderRecipientAddressMatch = { message: 'Sender and recipient addresses cannot be the same' };
    }
  }
  
  // Check if pickup and destination locations match
  if (pickupLocation && destination) {
    const normalizedPickup = pickupLocation.toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedDestination = destination.toLowerCase().trim().replace(/\s+/g, ' ');
    
    if (normalizedPickup === normalizedDestination) {
      errors.pickupDestinationMatch = { message: 'Pickup and destination locations cannot be the same' };
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

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
  senderAddress?: string;
  senderEmail?: string;
  recipientAddress?: string;
  recipientEmail?: string;
}

@Component({
  selector: 'app-create-delivery',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MapComponent],
  templateUrl: './create-delivery.html',
  styleUrls: ['./create-delivery.css']
})
export class CreateDelivery implements OnInit {
  @ViewChild('mapComponent') mapComponent!: MapComponent;
  @ViewChild('trackingMapComponent') trackingMapComponent!: MapComponent;
  
  userRole: string = 'ADMIN';
  
  activeTab = 'delivery';
  
  deliveryForm: FormGroup;
  pricePerKg: number = 100;
  totalPrice: number = 0;
  isEditMode: boolean = false;
  originalOrderDetails: OrderDetails | null = null;
  
  // Map-related properties
  mapMarkers: MapLocation[] = [];
  mapCenter: MapCoordinates = { lat: -1.2921, lng: 36.8219 };
  showMap: boolean = false;
  showRoute: boolean = true;
  pickupCoordinates: MapCoordinates | null = null;
  destinationCoordinates: MapCoordinates | null = null;

  
  // Address suggestions
  pickupSuggestions: AddressSuggestion[] = [];
  destinationSuggestions: AddressSuggestion[] = [];
  showPickupSuggestions: boolean = false;
  showDestinationSuggestions: boolean = false;
  
  routeDistance: number = 0;
  routeEstimatedTime: number = 0;
  
  isMobileView: boolean = false;
  showMobileMenu: boolean = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastService: ToastService,
    private mapService: MapService
  ) {
    this.deliveryForm = this.fb.group({
      // Sender Details
      senderName: ['', [Validators.required, Validators.minLength(2)]],
      senderAddress: ['', [Validators.required, Validators.minLength(5)]],
      senderContact: ['', [Validators.required, phoneNumberValidator]],
      senderEmail: ['', [Validators.required, emailValidator]],
      
      // Recipient Details
      recipientName: ['', [Validators.required, Validators.minLength(2)]],
      recipientAddress: ['', [Validators.required, Validators.minLength(5)]],
      recipientContact: ['', [Validators.required, phoneNumberValidator]],
      recipientEmail: ['', [Validators.required, emailValidator]],
      
      // Location Details
      pickupLocation: ['', [Validators.required, Validators.minLength(3)]],
      destination: ['', [Validators.required, Validators.minLength(3)]],
      parcelWeight: ['', [Validators.required, Validators.min(0.1), Validators.max(1000)]],
      pricePerKg: [this.pricePerKg, [Validators.required, Validators.min(0.01)]]
    }, { validators: senderRecipientValidator });

    // Listen to parcel weight changes to calculate total price
    this.deliveryForm.get('parcelWeight')?.valueChanges.subscribe(weight => {
      this.calculateTotalPrice(weight);
    });

    // Listen to price per kg changes to recalculate total price
    this.deliveryForm.get('pricePerKg')?.valueChanges.subscribe(price => {
      const weight = this.deliveryForm.get('parcelWeight')?.value;
      this.calculateTotalPrice(weight, price);
    });

    // Listen to form changes to trigger cross-field validation
    this.deliveryForm.valueChanges.subscribe(() => {
      this.checkSenderRecipientValidation();
    });

    // Setup address geocoding listeners
    this.setupAddressGeocodingListeners();
  }

  ngOnInit() {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state.editMode && state.orderDetails) {
        this.isEditMode = true;
        this.originalOrderDetails = state.orderDetails;
        this.populateFormWithOrderDetails(state.orderDetails);
        this.toastService.showInfo('Order loaded for editing');
      }
    }
    
    this.checkMobileView();
    
    window.addEventListener('resize', () => {
      this.checkMobileView();
    });
    
    this.showMap = true;
    console.log('Create delivery component initialized, showMap:', this.showMap);
  }

  private setupAddressGeocodingListeners(): void {
    this.deliveryForm.get('pickupLocation')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(async (address) => {
        if (address && address.length >= 3) {
          await this.geocodePickupAddress(address);
        } else {
          this.clearPickupMarker();
        }
      });

    this.deliveryForm.get('destination')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(async (address) => {
        if (address && address.length >= 3) {
          await this.geocodeDestinationAddress(address);
        } else {
          this.clearDestinationMarker();
        }
      });
  }

  private async geocodePickupAddress(address: string): Promise<void> {
    try {
      console.log('Geocoding pickup address:', address);
      const result = await this.mapService.geocodeAddress(address);
      console.log('Geocoding result:', result);
      if (result.success && result.location) {
        this.pickupCoordinates = { lat: result.location.lat, lng: result.location.lng };
        console.log('Pickup coordinates set:', this.pickupCoordinates);
        this.updateMapMarkers();
        this.showMap = true;
      }
    } catch (error) {
      console.error('Error geocoding pickup address:', error);
    }
  }

  private async geocodeDestinationAddress(address: string): Promise<void> {
    try {
      const result = await this.mapService.geocodeAddress(address);
      if (result.success && result.location) {
        this.destinationCoordinates = { lat: result.location.lat, lng: result.location.lng };
        this.updateMapMarkers();
        this.showMap = true;
      }
    } catch (error) {
      console.error('Error geocoding destination address:', error);
    }
  }

  private updateMapMarkers(): void {
    console.log('Updating map markers...');
    this.mapMarkers = [];

    if (this.pickupCoordinates) {
      this.mapMarkers.push({
        lat: this.pickupCoordinates.lat,
        lng: this.pickupCoordinates.lng,
        description: `<strong>Pickup Location</strong><br>${this.deliveryForm.get('pickupLocation')?.value}`,
        address: this.deliveryForm.get('pickupLocation')?.value
      });
      console.log('Added pickup marker');
    }

    if (this.destinationCoordinates) {
      this.mapMarkers.push({
        lat: this.destinationCoordinates.lat,
        lng: this.destinationCoordinates.lng,
        description: `<strong>Destination</strong><br>${this.deliveryForm.get('destination')?.value}`,
        address: this.deliveryForm.get('destination')?.value
      });
      console.log('Added destination marker');
    }



    if (this.mapMarkers.length > 0) {
      if (this.mapMarkers.length === 1) {
        this.mapCenter = { lat: this.mapMarkers[0].lat, lng: this.mapMarkers[0].lng };
        setTimeout(() => {
          this.fitMapToMarkers();
        }, 100);
      } else {
        const centerLat = (this.mapMarkers[0].lat + this.mapMarkers[1].lat) / 2;
        const centerLng = (this.mapMarkers[0].lng + this.mapMarkers[1].lng) / 2;
        this.mapCenter = { lat: centerLat, lng: centerLng };
        
        setTimeout(() => {
          this.fitMapToMarkers();
        }, 100);
      }
      console.log('Updated map center:', this.mapCenter);
    }
    
    console.log('Final map markers:', this.mapMarkers);
  }

  private clearPickupMarker(): void {
    this.pickupCoordinates = null;
    this.updateMapMarkers();
  }

  private clearDestinationMarker(): void {
    this.destinationCoordinates = null;
    this.updateMapMarkers();
  }

  async searchAddresses(query: string, isPickup: boolean = true): Promise<void> {
    if (query.length < 2) {
      if (isPickup) {
        this.pickupSuggestions = [];
        this.showPickupSuggestions = false;
      } else {
        this.destinationSuggestions = [];
        this.showDestinationSuggestions = false;
      }
      return;
    }

    try {
      const result = await this.mapService.getAddressSuggestions(query);
      
      if (result.isValid && result.suggestions && result.suggestions.length > 0) {
        if (isPickup) {
          this.pickupSuggestions = result.suggestions;
          this.showPickupSuggestions = true;
        } else {
          this.destinationSuggestions = result.suggestions;
          this.showDestinationSuggestions = true;
        }
        
        if (result.error) {
          this.toastService.showInfo('Using fallback location suggestions');
        }
      } else {
        if (isPickup) {
          this.pickupSuggestions = [];
          this.showPickupSuggestions = false;
        } else {
          this.destinationSuggestions = [];
          this.showDestinationSuggestions = false;
        }
        
        if (query.length >= 3) {
          this.toastService.showWarning('No locations found. Try a different search term.');
        }
      }
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      
      this.toastService.showError('Unable to fetch location suggestions. Please try again.');
      
      if (isPickup) {
        this.pickupSuggestions = [];
        this.showPickupSuggestions = false;
      } else {
        this.destinationSuggestions = [];
        this.showDestinationSuggestions = false;
      }
    }
  }

  selectAddress(suggestion: AddressSuggestion, isPickup: boolean = true): void {
    const address = suggestion.display_name;
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    if (isPickup) {
      this.deliveryForm.patchValue({ pickupLocation: address });
      this.pickupCoordinates = { lat, lng };
      this.showPickupSuggestions = false;
      console.log('Set pickup coordinates:', this.pickupCoordinates);
    } else {
      this.deliveryForm.patchValue({ destination: address });
      this.destinationCoordinates = { lat, lng };
      this.showDestinationSuggestions = false;
      console.log('Set destination coordinates:', this.destinationCoordinates);
    }

    this.updateMapMarkers();
    this.showMap = true;
    
    // Ensure map fits to show all markers with appropriate zoom
    setTimeout(() => {
      this.fitMapToMarkers();
    }, 200);
  }

  populateFormWithOrderDetails(orderDetails: OrderDetails) {
    this.deliveryForm.patchValue({
      senderName: orderDetails.senderName || '',
      senderAddress: orderDetails.senderAddress || '',
      senderContact: orderDetails.senderContact || '',
      senderEmail: orderDetails.senderEmail || '',
      recipientName: orderDetails.recipientName || '',
      recipientAddress: orderDetails.recipientAddress || '',
      recipientContact: orderDetails.recipientContact || '',
      recipientEmail: orderDetails.recipientEmail || '',
      pickupLocation: orderDetails.pickupLocation || '',
      destination: orderDetails.destination || '',
      parcelWeight: orderDetails.parcelWeight || '',
      pricePerKg: orderDetails.pricePerKg || this.pricePerKg
    });

    // Calculate total price
    this.calculateTotalPrice(orderDetails.parcelWeight, orderDetails.pricePerKg);
  }

  calculateTotalPrice(weight: number, pricePerKg?: number) {
    const currentPricePerKg = pricePerKg || this.deliveryForm.get('pricePerKg')?.value || this.pricePerKg;
    if (weight && weight > 0 && currentPricePerKg && currentPricePerKg > 0) {
      this.totalPrice = weight * currentPricePerKg;
    } else {
      this.totalPrice = 0;
    }
  }

  getFormattedTotalPrice(): string {
    return this.totalPrice > 0 ? `KSH ${this.totalPrice.toFixed(2)}` : 'KSH 0.00';
  }

  getFormattedPricePerKg(): string {
    const price = this.deliveryForm.get('pricePerKg')?.value || this.pricePerKg;
    return `KSH ${price.toFixed(2)}`;
  }

  getSubmitButtonText(): string {
    return this.isEditMode ? 'Update Delivery' : 'Create Order & Assign Driver';
  }

  onSubmit() {
    if (this.deliveryForm.valid) {
      const formData = this.deliveryForm.value;
      formData.totalPrice = this.totalPrice; // Adding calculated total price to form data
      
      // Add coordinates to form data
      formData.pickupCoordinates = this.pickupCoordinates;
      formData.destinationCoordinates = this.destinationCoordinates;
      
      // Add route information
      formData.estimatedDistance = this.routeDistance;
      formData.estimatedDeliveryTime = this.routeEstimatedTime;
      
      console.log('Enhanced delivery form submitted:', formData);
      
      // Create parcel details for driver assignment
      const parcelDetails = {
        id: this.generateParcelId(),
        pickupAddress: formData.pickupLocation,
        deliveryAddress: formData.destination,
        weight: formData.parcelWeight,
        price: this.totalPrice,
        pickupLat: this.pickupCoordinates?.lat,
        pickupLng: this.pickupCoordinates?.lng,
        deliveryLat: this.destinationCoordinates?.lat,
        deliveryLng: this.destinationCoordinates?.lng,
        estimatedDistance: this.routeDistance,
        estimatedDeliveryTime: this.routeEstimatedTime
      };
      
      // Navigate to assign driver with parcel details
      this.router.navigate(['/admin-assign-driver'], {
        state: { 
          orderDetails: formData,
          parcelDetails: parcelDetails
        }
      });
    } else {
      this.markFormGroupTouched();
      // Show error toast for validation errors
      this.toastService.showError('Please fill in all required fields correctly.');
    }
  }

  generateParcelId(): string {
    return Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  checkSenderRecipientValidation(): void {
    const formErrors = this.deliveryForm.errors;
    
    if (formErrors) {
      if (formErrors['senderRecipientEmailMatch']) {
        const senderEmailField = this.deliveryForm.get('senderEmail');
        const recipientEmailField = this.deliveryForm.get('recipientEmail');
        
        if (senderEmailField && recipientEmailField) {
          senderEmailField.setErrors({ ...senderEmailField.errors, crossField: formErrors['senderRecipientEmailMatch'].message });
          recipientEmailField.setErrors({ ...recipientEmailField.errors, crossField: formErrors['senderRecipientEmailMatch'].message });
        }
      }
      
      if (formErrors['senderRecipientContactMatch']) {
        const senderContactField = this.deliveryForm.get('senderContact');
        const recipientContactField = this.deliveryForm.get('recipientContact');
        
        if (senderContactField && recipientContactField) {
          senderContactField.setErrors({ ...senderContactField.errors, crossField: formErrors['senderRecipientContactMatch'].message });
          recipientContactField.setErrors({ ...recipientContactField.errors, crossField: formErrors['senderRecipientContactMatch'].message });
        }
      }
      
      if (formErrors['senderRecipientAddressMatch']) {
        const senderAddressField = this.deliveryForm.get('senderAddress');
        const recipientAddressField = this.deliveryForm.get('recipientAddress');
        
        if (senderAddressField && recipientAddressField) {
          senderAddressField.setErrors({ ...senderAddressField.errors, crossField: formErrors['senderRecipientAddressMatch'].message });
          recipientAddressField.setErrors({ ...recipientAddressField.errors, crossField: formErrors['senderRecipientAddressMatch'].message });
        }
      }
      
      if (formErrors['pickupDestinationMatch']) {
        const pickupLocationField = this.deliveryForm.get('pickupLocation');
        const destinationField = this.deliveryForm.get('destination');
        
        if (pickupLocationField && destinationField) {
          pickupLocationField.setErrors({ ...pickupLocationField.errors, crossField: formErrors['pickupDestinationMatch'].message });
          destinationField.setErrors({ ...destinationField.errors, crossField: formErrors['pickupDestinationMatch'].message });
        }
      }
    } else {
      // Clear cross-field errors if no form-level errors
      const fields = ['senderEmail', 'recipientEmail', 'senderContact', 'recipientContact', 'senderAddress', 'recipientAddress', 'pickupLocation', 'destination'];
      fields.forEach(fieldName => {
        const field = this.deliveryForm.get(fieldName);
        if (field && field.errors) {
          const { crossField, ...otherErrors } = field.errors;
          field.setErrors(Object.keys(otherErrors).length > 0 ? otherErrors : null);
        }
      });
    }
  }

  private markFormGroupTouched() {
    Object.keys(this.deliveryForm.controls).forEach(key => {
      const control = this.deliveryForm.get(key);
      control?.markAsTouched();
    });
  }

  getFieldError(fieldName: string): string {
    const field = this.deliveryForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['email']) {
        return 'Please enter a valid email address';
      }
      if (field.errors['emailFormat']) {
        return field.errors['emailFormat'].message;
      }
      if (field.errors['crossField']) {
        return field.errors['crossField'];
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        return 'Please enter a valid phone number';
      }
      if (field.errors['phoneNumber']) {
        return field.errors['phoneNumber'].message;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must be less than ${field.errors['max'].max}`;
      }
    }
    
    // Check for cross-field validation errors
    const formErrors = this.deliveryForm.errors;
    if (formErrors) {
      if (formErrors['senderRecipientEmailMatch'] && 
          (fieldName === 'senderEmail' || fieldName === 'recipientEmail')) {
        return formErrors['senderRecipientEmailMatch'].message;
      }
      if (formErrors['senderRecipientContactMatch'] && 
          (fieldName === 'senderContact' || fieldName === 'recipientContact')) {
        return formErrors['senderRecipientContactMatch'].message;
      }
      if (formErrors['senderRecipientAddressMatch'] && 
          (fieldName === 'senderAddress' || fieldName === 'recipientAddress')) {
        return formErrors['senderRecipientAddressMatch'].message;
      }
      if (formErrors['pickupDestinationMatch'] && 
          (fieldName === 'pickupLocation' || fieldName === 'destination')) {
        return formErrors['pickupDestinationMatch'].message;
      }
    }
    
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      senderName: 'Sender name',
      senderAddress: 'Sender address',
      senderContact: 'Sender contact',
      senderEmail: 'Sender email',
      recipientName: 'Recipient name',
      recipientAddress: 'Recipient address',
      recipientContact: 'Recipient contact',
      recipientEmail: 'Recipient email',
      pickupLocation: 'Pickup location',
      destination: 'Destination',
      parcelWeight: 'Parcel weight',
      pricePerKg: 'Price per kilogram'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.deliveryForm.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  // Map event handlers
  onMapReady(map: L.Map): void {
    console.log('Map is ready for create delivery', map);
    console.log('Current map markers:', this.mapMarkers);
    console.log('Map center:', this.mapCenter);
  }

  onMarkerClick(location: MapLocation): void {
    console.log('Marker clicked:', location);
  }

  onMapClick(coordinates: MapCoordinates): void {
    console.log('Map clicked at:', coordinates);
    // Allow users to select locations by clicking on map
    if (!this.pickupCoordinates) {
      this.setPickupFromMap(coordinates);
    } else if (!this.destinationCoordinates) {
      this.setDestinationFromMap(coordinates);
    } else {
      // Both locations set, ask user which one to update
      this.showLocationSelectionDialog(coordinates);
    }
  }

  onMapError(error: MapError): void {
    console.error('Map error:', error);
    this.toastService.showError(`Map error: ${error.message}`);
  }

  onRouteUpdated(routeInfo: { distance: number; estimatedTime: number }): void {
    this.routeDistance = routeInfo.distance;
    this.routeEstimatedTime = routeInfo.estimatedTime;
    console.log('Route updated:', routeInfo);
  }

  /**
   * Fit map to show all markers with appropriate zoom
   */
  public fitMapToMarkers(): void {
    if (this.mapMarkers.length > 0) {
      // Fit the main map component (delivery tab)
      if (this.mapComponent) {
        this.mapComponent.fitToMarkers();
      }
      
      // Also fit the tracking map component if it exists
      if (this.trackingMapComponent) {
        this.trackingMapComponent.fitToMarkers();
      }
    }
  }



  /**
   * Toggle route display on map
   */
  toggleRouteDisplay(): void {
    this.showRoute = !this.showRoute;
  }

  private async setPickupFromMap(coordinates: MapCoordinates): Promise<void> {
    try {
      const result = await this.mapService.reverseGeocode(coordinates.lat, coordinates.lng);
      if (result.success && result.address) {
        this.deliveryForm.patchValue({ pickupLocation: result.address });
        this.pickupCoordinates = coordinates;
        this.updateMapMarkers();
        this.toastService.showSuccess('Pickup location set from map');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      this.toastService.showError('Unable to get address for selected location');
    }
  }

  private async setDestinationFromMap(coordinates: MapCoordinates): Promise<void> {
    try {
      const result = await this.mapService.reverseGeocode(coordinates.lat, coordinates.lng);
      if (result.success && result.address) {
        this.deliveryForm.patchValue({ destination: result.address });
        this.destinationCoordinates = coordinates;
        this.updateMapMarkers();
        this.toastService.showSuccess('Destination set from map');
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      this.toastService.showError('Unable to get address for selected location');
    }
  }

  private showLocationSelectionDialog(coordinates: MapCoordinates): void {
    const choice = confirm('Both pickup and destination are set. Click OK to update pickup location, or Cancel to update destination.');
    if (choice) {
      this.setPickupFromMap(coordinates);
    } else {
      this.setDestinationFromMap(coordinates);
    }
  }



  switchTab(tab: string) {
    this.activeTab = tab;
    
    if (tab === 'tracking') {
      setTimeout(() => {
        this.updateMapMarkers();
        if (this.trackingMapComponent) {
          this.trackingMapComponent.fitToMarkers();
        }
      }, 200);
    }
  }

  checkMobileView(): void {
    this.isMobileView = window.innerWidth <= 768;
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    // Prevent body scroll when menu is open
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu(): void {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    window.removeEventListener('resize', () => {
      this.checkMobileView();
    });
  }
}
