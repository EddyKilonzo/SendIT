import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface DriverLocation {
  driverId: string;
  driverName: string;
  currentLat: number;
  currentLng: number;
  lastActiveAt: Date;
  vehicleType?: string;
  vehicleNumber?: string;
  assignedParcelId?: string;
  timestamp: Date;
}

export interface DriverAssignment {
  driverId: string;
  parcelId: string;
  driverName: string;
  vehicleType?: string;
  timestamp: Date;
}

export interface ParcelStatusUpdate {
  parcelId: string;
  driverId: string;
  status: string;
  location?: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval: any;

  // Subjects for different types of updates
  private driverLocationSubject = new Subject<DriverLocation>();
  private driverAssignmentSubject = new Subject<DriverAssignment>();
  private parcelStatusSubject = new Subject<ParcelStatusUpdate>();

  // Observables
  public driverLocationUpdates$ = this.driverLocationSubject.asObservable();
  public driverAssignmentUpdates$ = this.driverAssignmentSubject.asObservable();
  public parcelStatusUpdates$ = this.parcelStatusSubject.asObservable();

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.socket && this.isConnected) {
      console.log('🚀 WebSocket already connected');
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      console.error('❌ No auth token available for WebSocket connection');
      return;
    }

    console.log('🔌 Connecting to WebSocket...');
    
    // Disconnect existing socket if any
    if (this.socket) {
      this.socket.disconnect();
    }
    
    this.socket = io(`${environment.apiUrl.replace('/api', '')}/drivers`, {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: false, // We'll handle reconnection manually
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.clearReconnectInterval();
    });

    this.socket.on('connected', (data: any) => {
      console.log('✅ WebSocket connection confirmed:', data);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.reconnect();
      }
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ WebSocket connection error:', error);
      this.isConnected = false;
      this.reconnect();
    });

    this.socket.on('error', (error: any) => {
      console.error('❌ WebSocket error:', error);
      if (error.message === 'Authentication failed') {
        console.log('🔄 Authentication failed, attempting to refresh token...');
        this.handleAuthError();
      }
    });

    // Listen for driver location updates
    this.socket.on('driverLocationUpdate', (data: DriverLocation) => {
      console.log('📍 Driver location update received:', data);
      this.driverLocationSubject.next(data);
    });

    // Listen for driver assignment updates
    this.socket.on('driverAssignmentUpdate', (data: DriverAssignment) => {
      console.log('👤 Driver assignment update received:', data);
      this.driverAssignmentSubject.next(data);
    });

    // Listen for parcel status updates
    this.socket.on('parcelStatusUpdate', (data: ParcelStatusUpdate) => {
      console.log('📦 Parcel status update received:', data);
      this.parcelStatusSubject.next(data);
    });

    // Listen for confirmation messages
    this.socket.on('locationUpdated', (data: any) => {
      console.log('✅ Location update confirmed:', data);
    });

    this.socket.on('subscribed', (data: any) => {
      console.log('✅ Subscription confirmed:', data);
    });

    this.socket.on('unsubscribed', (data: any) => {
      console.log('✅ Unsubscription confirmed:', data);
    });
  }

  private handleAuthError(): void {
    // Try to refresh the token
    this.authService.refreshToken().subscribe({
      next: (response) => {
        console.log('🔄 Token refreshed, reconnecting...');
        this.connect();
      },
      error: (error) => {
        console.error('❌ Failed to refresh token:', error);
        // If refresh fails, redirect to login
        this.authService.logout().subscribe();
      }
    });
  }

  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      this.clearReconnectInterval();
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    // Clear any existing interval
    this.clearReconnectInterval();
    
    // Set up new reconnection attempt
    this.reconnectInterval = setTimeout(() => {
      this.connect();
    }, 1000 * this.reconnectAttempts); // Exponential backoff
  }

  private clearReconnectInterval(): void {
    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }
  }

  disconnect(): void {
    this.clearReconnectInterval();
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Method for drivers to update their location
  updateLocation(locationData: {
    driverId: string;
    currentLat: number;
    currentLng: number;
    address?: string;
  }): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ WebSocket not connected, cannot update location');
      return;
    }

    console.log('📍 Sending location update:', locationData);
    this.socket.emit('updateLocation', locationData);
  }

  // Method to subscribe to a specific driver's updates
  subscribeToDriver(driverId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ WebSocket not connected, cannot subscribe to driver');
      return;
    }

    console.log(`👤 Subscribing to driver ${driverId}`);
    this.socket.emit('subscribeToDriver', { driverId });
  }

  // Method to unsubscribe from a specific driver's updates
  unsubscribeFromDriver(driverId: string): void {
    if (!this.socket || !this.isConnected) {
      console.warn('⚠️ WebSocket not connected, cannot unsubscribe from driver');
      return;
    }

    console.log(`👤 Unsubscribing from driver ${driverId}`);
    this.socket.emit('unsubscribeFromDriver', { driverId });
  }

  // Get connection status
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Method to get all active drivers with their current locations
  getActiveDrivers(): Observable<DriverLocation[]> {
    // This would typically fetch from an API endpoint
    // For now, we'll return an empty array
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }

  // Method to get driver location history
  getDriverLocationHistory(driverId: string, hours: number = 24): Observable<DriverLocation[]> {
    // This would typically fetch from an API endpoint
    // For now, we'll return an empty array
    return new Observable(observer => {
      observer.next([]);
      observer.complete();
    });
  }
}