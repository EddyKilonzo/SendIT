import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { ToastService } from '../shared/toast/toast.service';
import { SidebarComponent } from '../shared/sidebar/sidebar';
import { AuthService, User } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// Custom validators
function phoneNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  // More flexible phone number validation to match backend
  const phonePattern = /^\+?[\d\s\-()]+$/;
  
  if (!phonePattern.test(control.value)) {
    return { phoneNumber: { message: 'Please provide a valid phone number' } };
  }
  
  return null;
}
// Email format validator
function emailValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailPattern.test(control.value)) {
    return { emailFormat: { message: 'Please enter a valid email address' } };
  }
  
  return null;
}
// Password strength validator
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

interface DriverApplication {
  licenseNumber: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  reason?: string;
  applicationDate?: Date;
  approvalDate?: Date;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, SidebarComponent],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit, AfterViewInit {
  @ViewChild('profilePictureSection', { static: false }) profilePictureSection!: ElementRef;
  @ViewChild('personalInfoSection', { static: false }) personalInfoSection!: ElementRef;
  @ViewChild('passwordSection', { static: false }) passwordSection!: ElementRef;
  @ViewChild('driverApplicationSection', { static: false }) driverApplicationSection!: ElementRef;
  @ViewChild('accountManagementSection', { static: false }) accountManagementSection!: ElementRef;

  profileForm: FormGroup;
  passwordForm: FormGroup;
  driverApplicationForm: FormGroup;
  userProfile: User | null = null;
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  showDeleteConfirmation = false;
  showDeactivateConfirmation = false;
  isLoading = false;
  initialProfileData: any;
  initialPasswordData: any;
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverRejectionReason?: string;
  driverApplication?: DriverApplication;
  showReapplyForm = false; // Add this property for reapply form visibility

  // Password visibility states
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  


  constructor(
    private fb: FormBuilder,
    private router: Router,
    private toastService: ToastService,
    private authService: AuthService,
    private http: HttpClient
  ) {
    // Initialize forms with empty values - will be populated with real data
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, emailValidator]],
      phone: ['', [phoneNumberValidator]], // Made optional for testing
      address: ['', [Validators.minLength(5)]] // Made optional for testing
      // Removed city, state, zipCode as they don't exist in User interface
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8), passwordStrengthValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.driverApplicationForm = this.fb.group({
      licenseNumber: ['', [Validators.required, Validators.minLength(5)]],
      vehicleNumber: [''],
      vehicleType: ['', [Validators.required]],
      reason: ['', [Validators.required, Validators.minLength(5)]]
    });

    // Store initial form values
    this.initialProfileData = this.profileForm.value;
    this.initialPasswordData = this.passwordForm.value;
  }

  ngOnInit() {
    this.loadUserProfile();
  }

  private loadUserProfile() {
    this.isLoading = true;
    
    // Get authentication token
    const token = this.authService.getToken();
    if (!token) {
      this.toastService.showError('Authentication required. Please login again.');
      this.router.navigate(['/login']);
      return;
    }
    
    // Set up headers with authentication
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Fetch fresh data directly from database
    this.http.get<{ success: boolean; data: User; message: string }>(
      `${environment.apiUrl}/users/profile/me`,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.id) {
          this.userProfile = response.data;
          this.populateFormsWithUserData(response.data);
          this.isLoading = false;
        } else {
          this.isLoading = false;
          this.toastService.showError('No profile data received');
        }
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.toastService.showError('Authentication expired. Please login again.');
          this.router.navigate(['/login']);
        } else if (error.status === 0) {
          // Network error - backend not available
          this.toastService.showError('Backend service is not available. Please try again later.');
        } else {
          this.toastService.showError('Failed to load profile data. Please try again.');
        }
      }
    });
  }

  private populateFormsWithUserData(user: User) {
    // Populate forms with real data
    this.profileForm.patchValue({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || ''
    });
    
    // Load driver application data
    this.driverApplicationStatus = user.driverApplicationStatus || 'NOT_APPLIED';
    this.driverRejectionReason = user.driverRejectionReason;
    
    // Only create driver application object if user has actually applied
    if (user.driverApplicationStatus && user.driverApplicationStatus !== 'NOT_APPLIED') {
      this.driverApplication = {
        licenseNumber: user.licenseNumber || '',
        vehicleNumber: user.vehicleNumber,
        vehicleType: user.vehicleType,
        reason: 'I want to help deliver packages and earn extra income while providing excellent service to customers.',
        applicationDate: user.driverApplicationDate || new Date(),
        approvalDate: user.driverApprovalDate
      };
    } else {
      // Reset driver application object for users who haven't applied
      this.driverApplication = undefined;
    }
    
    // Reset driver application form for customers who haven't applied or were rejected
    if (user.role === 'CUSTOMER' && (!this.driverApplicationStatus || this.driverApplicationStatus === 'NOT_APPLIED' || this.driverApplicationStatus === 'REJECTED')) {
      this.driverApplicationForm.reset();
    }
    
    // Update initial form data
    this.initialProfileData = this.profileForm.value;
  }

  ngAfterViewInit() {
    this.setupScrollAnimations();
  }

  private setupScrollAnimations(): void {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-fade-in-up');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe all sections with scroll-animate class
    const sections = document.querySelectorAll('.scroll-animate');
    sections.forEach(section => {
      observer.observe(section);
    });
  }

  // Custom password match validator
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: { message: 'Passwords do not match' } };
    }
    
    return null;
  }
  // Handle image selection and preview
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
  // Upload profile image
  uploadProfileImage() {
    if (!this.selectedImage || !this.userProfile) {
      this.toastService.showError('Please select an image first');
      return;
    }

    this.isLoading = true;
    
    // Get authentication token
    const token = this.authService.getToken();
    if (!token) {
      this.toastService.showError('Authentication required. Please login again.');
      this.router.navigate(['/login']);
      return;
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('profilePicture', this.selectedImage);
    
    // Set up headers with authentication (without Content-Type for FormData)
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    // Upload profile picture via API
    this.http.post<{ success: boolean; data: { profilePicture: string }; message: string }>(
      `${environment.apiUrl}/users/profile/upload-picture`,
      formData,
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Update the user profile with new picture URL
          this.userProfile!.profilePicture = response.data.profilePicture;
          
          // Update the current user in the auth service
          if (this.userProfile) {
            this.authService.updateCurrentUser(this.userProfile);
          }
          
          this.selectedImage = null;
          this.imagePreview = null;
          this.isLoading = false;
          this.toastService.showSuccess(response.message || 'Profile image updated successfully');
        } else {
          this.toastService.showError('Failed to upload profile image');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error uploading profile image:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.toastService.showError('Authentication expired. Please login again.');
          this.router.navigate(['/login']);
        } else {
          this.toastService.showError('Failed to upload profile image. Please try again.');
        }
      }
    });
  }

  saveProfileChanges() {
    if (this.profileForm.valid && this.userProfile) {
      this.isLoading = true;
      
      const formData = this.profileForm.value;
      
      // Only include fields that have actually changed
      const updateData: any = {};
      
      if (formData.name !== this.initialProfileData.name) {
        updateData.name = formData.name;
      }
      if (formData.email !== this.initialProfileData.email) {
        updateData.email = formData.email;
      }
      if (formData.phone !== this.initialProfileData.phone) {
        updateData.phone = formData.phone;
      }
      if (formData.address !== this.initialProfileData.address) {
        updateData.address = formData.address;
      }
      
      // If no changes, show message and return
      if (Object.keys(updateData).length === 0) {
        this.toastService.showInfo('No changes to save');
        this.isLoading = false;
        return;
      }
      
      // Get authentication token
      const token = this.authService.getToken();
      if (!token) {
        this.toastService.showError('Authentication required. Please login again.');
        this.router.navigate(['/login']);
        return;
      }
      
      // Set up headers with authentication
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Update user profile via API
      this.http.patch<User>(
        `${environment.apiUrl}/users/${this.userProfile.id}`,
        updateData,
        { headers }
      ).subscribe({
        next: (response) => {
          if (response && response.id) {
            // Direct user object format (current backend response)
            this.userProfile = response;
            this.initialProfileData = { ...formData };
            
            // Update AuthService with new user data to prevent caching issues
            this.authService.updateCurrentUser(response);
            
            this.isLoading = false;
            this.toastService.showSuccess('Profile updated successfully');
          } else {
            this.toastService.showError('Failed to update profile');
            this.isLoading = false;
          }
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          console.error('Error details:', error.error);
          this.isLoading = false;
          
          if (error.status === 401) {
            this.toastService.showError('Authentication expired. Please login again.');
            this.router.navigate(['/login']);
          } else if (error.status === 400) {
            const errorMessage = error.error?.message || 'Invalid data provided';
            this.toastService.showError(errorMessage);
          } else if (error.status === 409) {
            this.toastService.showError('Email already exists. Please use a different email.');
          } else {
            const errorMessage = error.error?.message || error.message || 'Failed to update profile';
            this.toastService.showError(errorMessage);
          }
        }
      });
    } else {
      this.markFormGroupTouched(this.profileForm);
      this.toastService.showError('Please fill in all required fields correctly');
    }
  }

  changePassword() {
    if (this.passwordForm.valid && this.userProfile) {
      this.isLoading = true;
      
      const formData = this.passwordForm.value;
      
      // Use AuthService to change password
      this.authService.changePassword(formData.currentPassword, formData.newPassword)
        .subscribe({
          next: (success) => {
            if (success) {
              this.passwordForm.reset();
              this.initialPasswordData = this.passwordForm.value;
              this.isLoading = false;
              this.toastService.showSuccess('Password changed successfully');
            } else {
              this.toastService.showError('Failed to change password');
              this.isLoading = false;
            }
          },
          error: (error) => {
            console.error('Error changing password:', error);
            this.toastService.showError('Failed to change password');
            this.isLoading = false;
          }
        });
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
    
    // Get authentication token
    const token = this.authService.getToken();
    if (!token) {
      this.toastService.showError('Authentication required. Please login again.');
      this.router.navigate(['/login']);
      return;
    }
    
    // Set up headers with authentication
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Call deactivate account API
    this.http.patch<{ success: boolean; message: string }>(
      `${environment.apiUrl}/users/profile/deactivate`,
      {},
      { headers }
    ).subscribe({
      next: (response) => {
        if (response.success) {
          this.userProfile!.isActive = false;
          this.showDeactivateConfirmation = false;
          this.isLoading = false;
          this.toastService.showSuccess('Account deactivated successfully');
          // Redirect to login after deactivation
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.toastService.showError('Failed to deactivate account');
          this.isLoading = false;
        }
      },
      error: (error) => {
        console.error('Error deactivating account:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.toastService.showError('Authentication expired. Please login again.');
          this.router.navigate(['/login']);
        } else {
          this.toastService.showError('Failed to deactivate account. Please try again.');
        }
      }
    });
  }

  deleteAccount() {
    this.showDeleteConfirmation = true;
  }

  confirmDelete() {
    this.isLoading = true;
    
    // Get authentication token
    const token = this.authService.getToken();
    if (!token) {
      this.toastService.showError('Authentication required. Please login again.');
      this.router.navigate(['/login']);
      return;
    }
    
    // Set up headers with authentication
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Call delete account API
    this.http.delete<{ success: boolean; message: string }>(
      `${environment.apiUrl}/users/profile/delete`,
      { headers }
    ).subscribe({
      next: (response) => {
        this.showDeleteConfirmation = false;
        this.isLoading = false;
        this.toastService.showSuccess('Account deleted successfully');
        // Clear auth and redirect to login after deletion
        this.authService.logout().subscribe(() => {
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        });
      },
      error: (error) => {
        console.error('Error deleting account:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.toastService.showError('Authentication expired. Please login again.');
          this.router.navigate(['/login']);
        } else {
          this.toastService.showError('Failed to delete account. Please try again.');
        }
      }
    });
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

  // Driver Application Methods
  submitDriverApplication() {
    if (this.driverApplicationForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const formData = this.driverApplicationForm.value;
      const applicationData = {
        licenseNumber: formData.licenseNumber,
        vehicleNumber: formData.vehicleNumber || '',
        vehicleType: formData.vehicleType || '',
        reason: formData.reason || ''
      };

      const headers = this.authService.getAuthHeaders();
      
      // Store the previous status to determine if this is a reapplication
      const wasRejected = this.driverApplicationStatus === 'REJECTED';
      
      this.http.post(
        `${environment.apiUrl}/drivers/apply`,
        applicationData,
        { headers }
      ).subscribe({
        next: (response) => {
          // Backend returns the data directly, not wrapped in success object
          const applicationDate = new Date();
          
          // Update local user profile with application data
          if (this.userProfile) {
            this.userProfile.driverApplicationStatus = 'PENDING';
            this.userProfile.driverApplicationDate = applicationDate;
            this.userProfile.licenseNumber = formData.licenseNumber;
            this.userProfile.vehicleNumber = formData.vehicleNumber;
            this.userProfile.vehicleType = formData.vehicleType;
            // Clear rejection reason when reapplying
            this.userProfile.driverRejectionReason = undefined;
          }
          
          this.driverApplicationStatus = 'PENDING';
          this.driverRejectionReason = undefined;
          this.driverApplication = {
            ...formData,
            applicationDate: applicationDate
          };
          
          // Hide reapply form after successful submission
          this.showReapplyForm = false;
          
          this.isLoading = false;
          this.toastService.showSuccess(
            wasRejected 
              ? 'Driver application resubmitted successfully!' 
              : 'Driver application submitted successfully!'
          );
          
          // Reset form
          this.driverApplicationForm.reset();
        },
        error: (error) => {
          console.error('Error submitting driver application:', error);
          this.isLoading = false;
          
          if (error.status === 401) {
            this.toastService.showError('Authentication expired. Please login again.');
            this.router.navigate(['/login']);
          } else if (error.status === 400) {
            const errorMessage = error.error?.message || 'Invalid application data';
            this.toastService.showError(errorMessage);
          } else {
            this.toastService.showError('Failed to submit driver application. Please try again.');
          }
        }
      });
    } else {
      this.markFormGroupTouched(this.driverApplicationForm);
      this.toastService.showError('Please fill in all required fields correctly');
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'APPROVED':
        return 'status-approved';
      case 'REJECTED':
        return 'status-rejected';
      default:
        return '';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'fas fa-clock';
      case 'APPROVED':
        return 'fas fa-check-circle';
      case 'REJECTED':
        return 'fas fa-times-circle';
      default:
        return 'fas fa-info-circle';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Under Review';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  getVehicleTypeDisplay(vehicleType?: string): string {
    switch (vehicleType) {
      case 'MOTORCYCLE':
        return 'Motorcycle';
      case 'CAR':
        return 'Car';
      case 'VAN':
        return 'Van';
      case 'TRUCK':
        return 'Truck';
      default:
        return 'Not specified';
    }
  }

  // Password visibility toggle methods
  toggleCurrentPasswordVisibility() {
    this.showCurrentPassword = !this.showCurrentPassword;
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }
}
