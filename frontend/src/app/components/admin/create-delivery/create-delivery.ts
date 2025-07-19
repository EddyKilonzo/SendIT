import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastService } from '../../shared/toast/toast.service';

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
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './create-delivery.html',
  styleUrls: ['./create-delivery.css']
})
export class CreateDelivery implements OnInit {
  deliveryForm: FormGroup;
  pricePerKg: number = 100; // Fixed price per kg in KSH
  totalPrice: number = 0;
  isEditMode: boolean = false;
  originalOrderDetails: OrderDetails | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastService: ToastService
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
  }

  ngOnInit() {
    // Check if we're in edit mode
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

  // Get formatted total price for display
  getFormattedTotalPrice(): string {
    return this.totalPrice > 0 ? `KSH ${this.totalPrice.toFixed(2)}` : 'KSH 0.00';
  }

  // Get formatted price per kg for display
  getFormattedPricePerKg(): string {
    const price = this.deliveryForm.get('pricePerKg')?.value || this.pricePerKg;
    return `KSH ${price.toFixed(2)}`;
  }

  // Get submit button text
  getSubmitButtonText(): string {
    return this.isEditMode ? 'Update Delivery' : 'Create Delivery';
  }

  onSubmit() {
    if (this.deliveryForm.valid) {
      const formData = this.deliveryForm.value;
      formData.totalPrice = this.totalPrice; // Adding calculated total price to form data
      
      console.log('Delivery form submitted:', formData);
      
      // Create parcel details for driver assignment
      const parcelDetails = {
        id: this.generateParcelId(),
        pickupAddress: formData.pickupLocation,
        deliveryAddress: formData.destination,
        weight: formData.parcelWeight,
        price: this.totalPrice
      };
      
      // Navigate to order confirmation with parcel details
      this.router.navigate(['/order-confirmation'], {
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
    } else {
      // Clear cross-field errors if no form-level errors
      const fields = ['senderEmail', 'recipientEmail', 'senderContact', 'recipientContact'];
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
}
