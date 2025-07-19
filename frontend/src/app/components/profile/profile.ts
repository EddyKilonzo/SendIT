import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastService } from '../shared/toast/toast.service';

// Custom validators
function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  const digitsOnly = control.value.replace(/\D/g, '');
  
  if (digitsOnly.length !== 10) {
    return { phoneNumber: { message: 'Phone number must be exactly 10 digits' } };
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

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  const password = control.value;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return { passwordStrength: { message: 'Password must contain uppercase, lowercase, number, and special character' } };
  }
  
  return null;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  profileImage?: string;
  isActive: boolean;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit {
  profileForm: FormGroup;
  passwordForm: FormGroup;
  userProfile: UserProfile;
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  showDeleteConfirmation = false;
  showDeactivateConfirmation = false;
  isLoading = false;
  initialProfileData: any;
  initialPasswordData: any;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastService: ToastService
  ) {
    // Initialize with dummy data
    this.userProfile = {
      id: '1',
      name: 'Sophia Carter',
      email: 'sophia.carter@example.com',
      phone: '0712345678',
      address: '123 Main Street',
      city: 'Nairobi',
      state: 'Nairobi',
      zipCode: '00100',
      role: 'CUSTOMER',
      profileImage: '/images/premium_photo-1681487863055-6e87-removebg-preview.jpg',
      isActive: true
    };

    this.profileForm = this.fb.group({
      name: [this.userProfile.name, [Validators.required, Validators.minLength(2)]],
      email: [this.userProfile.email, [Validators.required, emailValidator]],
      phone: [this.userProfile.phone, [Validators.required, phoneNumberValidator]],
      address: [this.userProfile.address, [Validators.required, Validators.minLength(5)]],
      city: [this.userProfile.city, [Validators.required]],
      state: [this.userProfile.state, [Validators.required]],
      zipCode: [this.userProfile.zipCode, [Validators.required, Validators.pattern(/^\d{5}$/)]]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Store initial form values
    this.initialProfileData = this.profileForm.value;
    this.initialPasswordData = this.passwordForm.value;
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  loadUserProfile() {
    // Since we're using dummy data, no need for loading simulation
    // In a real app, this would fetch from API
    this.isLoading = false;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: { message: 'Passwords do not match' } };
    }
    
    return null;
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.toastService.showError('Image size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        this.toastService.showError('Please select a valid image file');
        return;
      }
      
      this.selectedImage = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadProfileImage() {
    if (!this.selectedImage) {
      this.toastService.showError('Please select an image first');
      return;
    }

    this.isLoading = true;
    
    // Simulate upload
    setTimeout(() => {
      this.userProfile.profileImage = this.imagePreview || this.userProfile.profileImage;
      this.selectedImage = null;
      this.imagePreview = null;
      this.isLoading = false;
      this.toastService.showSuccess('Profile image updated successfully');
    }, 2000);
  }

  saveProfileChanges() {
    if (this.profileForm.valid) {
      this.isLoading = true;
      
      // Simulate API call
      setTimeout(() => {
        const formData = this.profileForm.value;
        this.userProfile = { ...this.userProfile, ...formData };
        this.initialProfileData = { ...formData }; // Update initial data after successful save
        this.isLoading = false;
        this.toastService.showSuccess('Profile updated successfully');
      }, 1500);
    } else {
      this.markFormGroupTouched(this.profileForm);
      this.toastService.showError('Please fill in all required fields correctly');
    }
  }

  changePassword() {
    if (this.passwordForm.valid) {
      this.isLoading = true;
      
      // Simulate API call
      setTimeout(() => {
        this.passwordForm.reset();
        this.initialPasswordData = this.passwordForm.value; // Update initial data after successful save
        this.isLoading = false;
        this.toastService.showSuccess('Password changed successfully');
      }, 1500);
    } else {
      this.markFormGroupTouched(this.passwordForm);
      this.toastService.showError('Please fill in all password fields correctly');
    }
  }

  deactivateAccount() {
    this.showDeactivateConfirmation = true;
  }

  confirmDeactivate() {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.userProfile.isActive = false;
      this.showDeactivateConfirmation = false;
      this.isLoading = false;
      this.toastService.showSuccess('Account deactivated successfully');
      // Redirect to login after deactivation
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }, 1500);
  }

  deleteAccount() {
    this.showDeleteConfirmation = true;
  }

  confirmDelete() {
    this.isLoading = true;
    
    // Simulate API call
    setTimeout(() => {
      this.showDeleteConfirmation = false;
      this.isLoading = false;
      this.toastService.showSuccess('Account deleted successfully');
      // Redirect to login after deletion
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);
    }, 1500);
  }

  cancelAction() {
    this.showDeleteConfirmation = false;
    this.showDeactivateConfirmation = false;
  }

  // Check if profile form has changes
  hasProfileChanges(): boolean {
    const currentValues = this.profileForm.value;
    return JSON.stringify(currentValues) !== JSON.stringify(this.initialProfileData);
  }

  // Check if password form has changes
  hasPasswordChanges(): boolean {
    const currentValues = this.passwordForm.value;
    return JSON.stringify(currentValues) !== JSON.stringify(this.initialPasswordData);
  }

  // Check if password form is empty (all fields empty)
  isPasswordFormEmpty(): boolean {
    const values = this.passwordForm.value;
    return !values.currentPassword && !values.newPassword && !values.confirmPassword;
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['emailFormat']) {
        return field.errors['emailFormat'].message;
      }
      if (field.errors['phoneNumber']) {
        return field.errors['phoneNumber'].message;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['pattern']) {
        if (fieldName === 'zipCode') {
          return 'Zip code must be 5 digits';
        }
        return 'Invalid format';
      }
      if (field.errors['passwordStrength']) {
        return field.errors['passwordStrength'].message;
      }
    }
    
    // Check for form-level errors
    if (form.errors) {
      if (form.errors['passwordMismatch'] && fieldName === 'confirmPassword') {
        return form.errors['passwordMismatch'].message;
      }
    }
    
    return '';
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Full name',
      email: 'Email',
      phone: 'Phone number',
      address: 'Address',
      city: 'City',
      state: 'State',
      zipCode: 'Zip code',
      currentPassword: 'Current password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password'
    };
    return labels[fieldName] || fieldName;
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  private markFormGroupTouched(form: FormGroup) {
    Object.keys(form.controls).forEach(key => {
      const control = form.get(key);
      control?.markAsTouched();
    });
  }
}
