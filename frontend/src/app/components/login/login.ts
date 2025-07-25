import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../shared/toast/toast.service';
import { AuthService, LoginDto } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  showPassword = false;
  isLoading = false;
  
  loginData: LoginDto = {
    email: '',
    password: ''
  };

  constructor(
    private toastService: ToastService,
    private authService: AuthService,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    // Validate form
    if (!this.loginData.email || !this.loginData.password) {
      this.toastService.showError('Please enter your email and password');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.loginData.email)) {
      this.toastService.showError('Please enter a valid email address');
      return;
    }

    this.isLoading = true;

    // Call auth service
    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Login successful:', response);
        
        // Redirect based on user role
        this.redirectBasedOnRole(response.user.role);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Login failed:', error);
        // Error is already handled by auth service with toast
      }
    });
  }

  private redirectBasedOnRole(role: string) {
    // Redirect to home page so users can see the dynamic CTA button
    this.router.navigate(['/']);
    this.toastService.showSuccess(`Welcome back! You can now ${this.getActionText(role)}.`);
  }

  private getActionText(role: string): string {
    switch (role) {
      case 'ADMIN':
        return 'create parcels';
      case 'DRIVER':
        return 'view assigned parcels';
      case 'CUSTOMER':
      default:
        return 'view your parcels';
    }
  }
}
