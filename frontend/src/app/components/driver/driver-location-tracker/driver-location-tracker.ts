import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealtimeService } from '../../../services/realtime.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Subscription, interval } from 'rxjs';
import { MapComponent } from '../../shared/map/map.component';
import { DriverLocation } from '../../../services/realtime.service';
import { DriversService } from '../../../services/drivers.service';

@Component({
  selector: 'app-driver-location-tracker',
  standalone: true,
  imports: [CommonModule, MapComponent],
  templateUrl: './driver-location-tracker.html',
  styleUrls: ['./driver-location-tracker.css']
})
export class DriverLocationTracker implements OnInit, OnDestroy {
  isConnected = false;
  isTracking = false;
  currentLocation: { lat: number; lng: number } | null = null;
  currentAddress: string = '';
  lastUpdateTime: Date = new Date();
  updateInterval = 30; // seconds
  driverId: string = '';

  private locationSubscription: Subscription | null = null;
  private trackingSubscription: Subscription | null = null;

  constructor(
    private realtimeService: RealtimeService,
    private authService: AuthService,
    private toastService: ToastService,
    private driversService: DriversService
  ) {}

  ngOnInit(): void {
    this.driverId = this.authService.getUserId() || '';
    this.connectToRealtime();
  }

  ngOnDestroy(): void {
    this.stopTracking();
    this.realtimeService.disconnect();
  }

  private connectToRealtime(): void {
    this.realtimeService.connect();
    this.isConnected = this.realtimeService.getConnectionStatus();
    
    if (this.isConnected) {
      this.toastService.showSuccess('Connected to real-time tracking');
    } else {
      this.toastService.showError('Failed to connect to real-time tracking');
    }
  }

  toggleTracking(): void {
    if (this.isTracking) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  }

  startTracking(): void {
    if (!this.isConnected) {
      this.toastService.showError('Not connected to real-time service');
      return;
    }

    this.isTracking = true;
    this.toastService.showSuccess('Location tracking started');

    // Start periodic location updates
    this.trackingSubscription = interval(this.updateInterval * 1000).subscribe(() => {
      this.updateLocationNow();
    });

    // Get initial location
    this.updateLocationNow();
  }

  stopTracking(): void {
    this.isTracking = false;
    this.toastService.showInfo('Location tracking stopped');

    if (this.trackingSubscription) {
      this.trackingSubscription.unsubscribe();
      this.trackingSubscription = null;
    }
  }

  updateLocationNow(): void {
    this.getCurrentLocation();
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.toastService.showError('Geolocation is not supported by this browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        this.currentLocation = { lat, lng };
        this.lastUpdateTime = new Date();

        // Send location to real-time service (WebSocket)
        this.realtimeService.updateLocation({
          driverId: this.driverId,
          currentLat: lat,
          currentLng: lng
        });

        // Also update location in database via API
        this.updateLocationInDatabase(lat, lng);

        // Get address from coordinates
        this.getAddressFromCoordinates(lat, lng);

        console.log('📍 Location updated:', { lat, lng, driverId: this.driverId });
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Failed to get current location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        this.toastService.showError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }

  private updateLocationInDatabase(lat: number, lng: number): void {
    console.log('📍 Updating driver location in database:', {
      driverId: this.driverId,
      lat,
      lng
    });
    
    // Update driver location in database via API
    this.driversService.updateDriverLocation(this.driverId, {
      currentLat: lat,
      currentLng: lng
    }).subscribe({
      next: (response) => {
        console.log('✅ Location updated in database successfully:', response);
        this.toastService.showSuccess('Location updated in database');
      },
      error: (error) => {
        console.error('❌ Failed to update location in database:', error);
        this.toastService.showError('Failed to update location in database');
      }
    });
  }

  private getAddressFromCoordinates(lat: number, lng: number): void {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    
    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data.display_name) {
          this.currentAddress = data.display_name;
        }
      })
      .catch(error => {
        console.error('Error getting address:', error);
      });
  }

  onDriverLocationUpdate(location: DriverLocation): void {
    console.log('Driver location update received:', location);
  }
}