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
  //success messag
  showSuccess(message: string, duration: number = 2000) {
    this.showToast({
      id: this.nextId++,
      type: 'success',
      message,
      duration
    });
  }
  //error message
  showError(message: string, duration: number = 2000) {
    this.showToast({
      id: this.nextId++,
      type: 'error',
      message,
      duration
    });
  }
  //warning message
  showWarning(message: string, duration: number = 2000) {
    this.showToast({
      id: this.nextId++,
      type: 'warning',
      message,
      duration
    });
  }
  //info message
  showInfo(message: string, duration: number = 2000) {
    this.showToast({
      id: this.nextId++,
      type: 'info',
      message,
      duration
    });
  }
  /**
   * Show a toast message.
   * @param toast 
   */
  private showToast(toast: ToastMessage) {
    this.toastSubject.next(toast);
    
    // Auto-hide after duration
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.hideToast();
      }, toast.duration);
    }
  }
  /**
   * Hide the currently displayed toast message.
   */
  hideToast() {
    this.toastSubject.next(null);
  }
} 