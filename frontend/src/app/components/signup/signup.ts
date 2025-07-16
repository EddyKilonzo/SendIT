import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  showPassword = false;
  
  signupData = {
    name: '',
    email: '',
    password: ''
  };

  constructor(private toastService: ToastService) {}

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

    console.log('Signup data:', this.signupData);
    
    // Simulate API call
    this.toastService.showSuccess('Account created successfully! Welcome to SendIT');
    
    // Add your signup logic here
    // You can redirect to login page after successful signup
  }
}
