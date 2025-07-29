import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RealtimeService, DriverLocation } from '../../../services/realtime.service';
import { ParcelsService } from '../../../services/parcels.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../shared/toast/toast.service';
import { MapComponent } from '../../shared/map/map.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-track-my-parcel',
  standalone: true,
  imports: [CommonModule, MapComponent],
  templateUrl: './track-my-parcel.html',
  styleUrls: ['./track-my-parcel.css']
})
export class TrackMyParcel implements OnInit, OnDestroy {
  isConnected = false;
  isLoading = false;
  myParcels: any[] = [];
  assignedDriver: DriverLocation | null = null;
  selectedParcelId: string | null = null;

  private realtimeSubscription: Subscription | null = null;
  private parcelsSubscription: Subscription | null = null;

  constructor(
    private realtimeService: RealtimeService,
    private parcelsService: ParcelsService,
    private authService: AuthService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.connectToRealtime();
    this.loadMyParcels();
  }

  ngOnDestroy(): void {
    this.cleanupSubscriptions();
  }

  private connectToRealtime(): void {
    this.realtimeService.connect();
    this.isConnected = this.realtimeService.getConnectionStatus();

    // Subscribe to driver location updates
    this.realtimeSubscription = this.realtimeService.driverLocationUpdates$.subscribe(
      (driverLocation: DriverLocation) => {
        this.updateDriverLocation(driverLocation);
      }
    );
  }

  private loadMyParcels(): void {
    this.isLoading = true;
    const userId = this.authService.getUserId();

    this.parcelsService.getMyParcels().subscribe({
      next: (response) => {
        this.myParcels = response.parcels || [];
        
        // Find parcels with assigned drivers
        const assignedParcel = this.myParcels.find(parcel => 
          parcel.driverId && parcel.status !== 'delivered' && parcel.status !== 'cancelled'
        );

        if (assignedParcel) {
          this.selectedParcelId = assignedParcel.id;
          this.loadDriverLocation(assignedParcel.driverId);
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading parcels:', error);
        this.toastService.showError('Failed to load your parcels');
        this.isLoading = false;
      }
    });
  }

  private loadDriverLocation(driverId: string): void {
    // Subscribe to specific driver updates
    this.realtimeService.subscribeToDriver(driverId);
  }

  private updateDriverLocation(driverLocation: DriverLocation): void {
    // Check if this is the driver assigned to our parcel
    const assignedParcel = this.myParcels.find(parcel => 
      parcel.driverId === driverLocation.driverId
    );

    if (assignedParcel) {
      this.assignedDriver = driverLocation;
      this.toastService.showInfo('Driver location updated');
    }
  }

  selectParcel(parcelId: string): void {
    this.selectedParcelId = parcelId;
    const parcel = this.myParcels.find(p => p.id === parcelId);
    
    if (parcel && parcel.driverId) {
      this.loadDriverLocation(parcel.driverId);
    }
  }

  getParcelStatus(parcel: any): string {
    switch (parcel.status) {
      case 'pending': return 'Pending Assignment';
      case 'assigned': return 'Driver Assigned';
      case 'in_transit': return 'In Transit';
      case 'out_for_delivery': return 'Out for Delivery';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return parcel.status;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'assigned': return '#17a2b8';
      case 'in_transit': return '#007bff';
      case 'out_for_delivery': return '#28a745';
      case 'delivered': return '#28a745';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  }

  private cleanupSubscriptions(): void {
    if (this.realtimeSubscription) {
      this.realtimeSubscription.unsubscribe();
    }
    if (this.parcelsSubscription) {
      this.parcelsSubscription.unsubscribe();
    }
  }
}