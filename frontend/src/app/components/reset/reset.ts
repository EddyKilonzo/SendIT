import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../shared/toast/toast.service';

@Component({
  selector: 'app-reset',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './reset.html',
  styleUrl: './reset.css'
})
export class Reset {
  currentStep = 1;
  showPassword = false;
  showConfirmPassword = false;
  
  resetData = {
    email: '',
    verificationCode: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private toastService: ToastService,
    private router: Router
  ) {}

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  getStepDescription(): string {
    switch (this.currentStep) {
      case 1:
        return 'Enter your email to receive a verification code';
      case 2:
        return 'Enter the verification code sent to your email';
      case 3:
        return 'Enter your new password';
      default:
        return '';
    }
  }

  onSubmit() {
    switch (this.currentStep) {
      case 1:
        this.sendVerificationCode();
        break;
      case 2:
        this.verifyCode();
        break;
      case 3:
        this.resetPassword();
        break;
    }
  }

  sendVerificationCode() {
    if (!this.resetData.email) {
      this.toastService.showError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.resetData.email)) {
      this.toastService.showError('Please enter a valid email address');
      return;
    }

    console.log('Sending verification code to:', this.resetData.email);
    this.toastService.showSuccess('Verification code sent to your email');
    this.currentStep = 2;
  }

  verifyCode() {
    if (!this.resetData.verificationCode) {
      this.toastService.showError('Please enter the verification code');
      return;
    }

    if (this.resetData.verificationCode.length !== 6) {
      this.toastService.showError('Verification code must be 6 digits');
      return;
    }

    console.log('Verifying code:', this.resetData.verificationCode);
    this.toastService.showSuccess('Code verified successfully');
    this.currentStep = 3;
  }

  resetPassword() {
    if (!this.resetData.password || !this.resetData.confirmPassword) {
      this.toastService.showError('Please enter both password fields');
      return;
    }

    if (this.resetData.password.length < 6) {
      this.toastService.showError('Password must be at least 6 characters long');
      return;
    }
    
    // Validate that passwords match
    if (this.resetData.password !== this.resetData.confirmPassword) {
      this.toastService.showError('Passwords do not match');
      return;
    }
    
    console.log('Resetting password for:', this.resetData.email);
    this.toastService.showSuccess('Password reset successfully! Redirecting to login...');
    
    // Redirect to login page after a short delay to show the success message
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 2000);
  }

  resendCode() {
    if (!this.resetData.email) {
      this.toastService.showError('Please enter your email address first');
      return;
    }

    console.log('Resending verification code to:', this.resetData.email);
    this.toastService.showInfo('Verification code resent to your email');
  }
}
