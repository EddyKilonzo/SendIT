import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ToastService } from './toast.service';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})
export class Toast implements OnInit, OnDestroy {
  message: ToastMessage | null = null;
  visible = false;
  progress = 100;
  private subscription: Subscription | null = null;
  private progressInterval: any = null;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.subscription = this.toastService.toast$.subscribe(toast => {
      if (toast) {
        this.message = toast;
        this.visible = true;
        this.startProgressTimer(toast.duration || 5000);
      } else {
        this.visible = false;
        this.stopProgressTimer();
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.stopProgressTimer();
  }

  startProgressTimer(duration: number) {
    this.progress = 100;
    this.stopProgressTimer();
    
    const interval = 50; // Update every 50ms for smooth animation
    const steps = duration / interval;
    const decrement = 100 / steps;
    
    this.progressInterval = setInterval(() => {
      this.progress -= decrement;
      if (this.progress <= 0) {
        this.progress = 0;
        this.stopProgressTimer();
      }
    }, interval);
  }

  stopProgressTimer() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  getIconClass(): string {
    if (!this.message) return '';
    
    switch (this.message.type) {
      case 'success':
        return 'fas fa-check-circle';
      case 'error':
        return 'fas fa-exclamation-circle';
      case 'warning':
        return 'fas fa-exclamation-triangle';
      case 'info':
        return 'fas fa-info-circle';
      default:
        return 'fas fa-info-circle';
    }
  }

  getToastClass(): string {
    if (!this.message) return '';
    
    return `toast toast-${this.message.type}`;
  }

  closeToast() {
    this.toastService.hideToast();
  }

  pauseTimer() {
    this.stopProgressTimer();
  }

  resumeTimer() {
    if (this.message && this.progress > 0) {
      const remainingTime = (this.progress / 100) * (this.message.duration || 5000);
      this.startProgressTimer(remainingTime);
    }
  }
}
