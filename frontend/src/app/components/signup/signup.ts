import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../shared/toast/toast.service';
import { AuthService, CreateUserDto } from '../../services/auth.service';

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
    private authService: AuthService
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    // Validate form
    if (!this.signupData.name || !this.signupData.email || !this.signupData.password) {
      this.toastService.showError('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.signupData.email)) {
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
    this.toastService.showSuccess('Registration successful! Please login to continue.');
  }
}
