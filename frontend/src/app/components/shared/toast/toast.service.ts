import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastMessage } from './toast';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new BehaviorSubject<ToastMessage | null>(null);
  public toast$ = this.toastSubject.asObservable();

  private nextId = 1;

  showSuccess(message: string, duration: number = 2000) {
    this.showToast({
      id: this.nextId++,
      type: 'success',
      message,
      duration
    });
  }

  showError(message: string, duration: number = 2000) {
    this.showToast({
      id: this.nextId++,
      type: 'error',
      message,
      duration
    });
  }

  showWarning(message: string, duration: number = 3000) {
    this.showToast({
      id: this.nextId++,
      type: 'warning',
      message,
      duration
    });
  }

  showInfo(message: string, duration: number = 5000) {
    this.showToast({
      id: this.nextId++,
      type: 'info',
      message,
      duration
    });
  }

  private showToast(toast: ToastMessage) {
    this.toastSubject.next(toast);
    
    // Auto-hide after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.hideToast();
      }, toast.duration);
    }
  }

  hideToast() {
    this.toastSubject.next(null);
  }
} 