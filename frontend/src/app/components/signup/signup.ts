import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../shared/toast/toast.service';
import { AuthService, CreateUserDto } from '../../services/auth.service';
import { ParcelsService, Parcel } from '../../services/parcels.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  showPassword = false;
  isLoading = false;
  checkingParcels = false;
  anonymousParcels: Parcel[] = [];
  showParcelsFound = false;
  
  signupData: CreateUserDto = {
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'CUSTOMER' // Default role
  };

  constructor(
    private toastService: ToastService, 
    private router: Router,
    private authService: AuthService,
    private parcelsService: ParcelsService
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  // Check for anonymous parcels when email is entered
  onEmailChange() {
    if (this.signupData.email && this.isValidEmail(this.signupData.email)) {
      this.checkAnonymousParcels();
    } else {
      this.anonymousParcels = [];
      this.showParcelsFound = false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private checkAnonymousParcels() {
    this.checkingParcels = true;
    this.parcelsService.getAnonymousParcels(this.signupData.email).subscribe({
      next: (parcels) => {
        this.checkingParcels = false;
        this.anonymousParcels = parcels;
        this.showParcelsFound = parcels.length > 0;
        
        if (parcels.length > 0) {
          this.toastService.showInfo(`Found ${parcels.length} previous parcel(s) for this email address. They will be linked to your account after registration.`);
        }
      },
      error: (error) => {
        this.checkingParcels = false;
        console.error('Error checking anonymous parcels:', error);
        // Don't show error to user, just continue with registration
      }
    });
  }

  onSubmit() {
    // Validate form
    if (!this.signupData.name || !this.signupData.email || !this.signupData.password) {
      this.toastService.showError('Please fill in all required fields');
      return;
    }

    // Validate email format
    if (!this.isValidEmail(this.signupData.email)) {
      this.toastService.showError('Please enter a valid email address');
      return;
    }

    // Validate password strength
    if (this.signupData.password.length < 6) {
      this.toastService.showError('Password must be at least 6 characters long');
      return;
    }

    // Validate name
    if (this.signupData.name.trim().length < 2) {
      this.toastService.showError('Name must be at least 2 characters long');
      return;
    }

    this.isLoading = true;

    // Call auth service
    this.authService.register(this.signupData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Registration successful:', response);
        
        // Show success message with parcel linking info
        if (this.anonymousParcels.length > 0) {
          this.toastService.showSuccess(`Registration successful! ${this.anonymousParcels.length} previous parcel(s) have been linked to your account. Please login to continue.`);
        } else {
          this.toastService.showSuccess('Registration successful! Please login to continue.');
        }
        
        // Redirect based on user role
        this.redirectBasedOnRole(response.user.role);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Registration failed:', error);
        // Error is already handled by auth service with toast
      }
    });
  }

  private redirectBasedOnRole(role: string) {
    // Redirect to login page after successful registration
    this.router.navigate(['/login']);
  }
}
