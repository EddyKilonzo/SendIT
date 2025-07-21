import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/toast/toast.service';

interface Driver {
  id: string;
  name: string;
  rating: number;
  deliveries: number;
  vehicleType: string;
  availability: string;
  isSelected: boolean;
}

interface ParcelDetails {
  id: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  price: number;
}

@Component({
  selector: 'app-assign-driver',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './assign-driver.html',
  styleUrls: ['./assign-driver.css']
})
export class AssignDriver implements OnInit {
  @Input() parcelDetails: ParcelDetails | null = null;
  @Output() driverAssigned = new EventEmitter<{ parcelId: string, driverId: string }>();

  assignForm: FormGroup;
  availableDrivers: Driver[] = [];
  filteredDrivers: Driver[] = [];
  selectedDriver: Driver | null = null;

  // Filter options
  vehicleTypes = ['All', 'Car', 'Van', 'Motorcycle', 'Truck'];
  availabilityOptions = ['All', 'Available', 'Busy', 'Offline'];
  ratingOptions = ['All', '4.5+', '4.0+', '3.5+'];

  constructor(
    private fb: FormBuilder,
    private toastService: ToastService,
    private router: Router
  ) {
    this.assignForm = this.fb.group({
      vehicleType: ['All'],
      availability: ['All'],
      rating: ['All']
    });
  }

  ngOnInit() {
    this.loadAvailableDrivers();
    this.setupFilterListeners();
    
    // Check if parcel details were passed from navigation
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      const state = navigation.extras.state as any;
      if (state.parcelDetails) {
        this.parcelDetails = state.parcelDetails;
        console.log('Parcel details received:', this.parcelDetails);
      }
    }
    
    // If no parcel details were passed, use a placeholder parcel
    if (!this.parcelDetails) {
      this.parcelDetails = {
        id: 'PLACEHOLDER123',
        pickupAddress: '123 Main Street, Nairobi CBD, Kenya',
        deliveryAddress: '456 Mombasa Road, Mombasa, Kenya',
        weight: 5.5,
        price: 550.00
      };
      console.log('Using placeholder parcel details:', this.parcelDetails);
    }
  }

  loadAvailableDrivers() {
    // Mock data - in real app, this would come from a service
    this.availableDrivers = [
      {
        id: '1',
        name: 'Ethan Carter',
        rating: 4.8,
        deliveries: 150,
        vehicleType: 'Van',
        availability: 'Available',
        isSelected: false
      },
      {
        id: '2',
        name: 'Liam Harper',
        rating: 4.5,
        deliveries: 200,
        vehicleType: 'Motorcycle',
        availability: 'Busy',
        isSelected: false
      },
      {
        id: '3',
        name: 'Noah Bennett',
        rating: 4.9,
        deliveries: 120,
        vehicleType: 'Car',
        availability: 'Available',
        isSelected: false
      },
      {
        id: '4',
        name: 'Oliver Wilson',
        rating: 4.7,
        deliveries: 180,
        vehicleType: 'Truck',
        availability: 'Available',
        isSelected: false
      },
      {
        id: '5',
        name: 'William Davis',
        rating: 4.3,
        deliveries: 95,
        vehicleType: 'Car',
        availability: 'Offline',
        isSelected: false
      }
    ];
    this.filteredDrivers = [...this.availableDrivers];
  }

  setupFilterListeners() {
    this.assignForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  applyFilters() {
    const { vehicleType, availability, rating } = this.assignForm.value;
    
    this.filteredDrivers = this.availableDrivers.filter(driver => {
      // Vehicle type filter
      if (vehicleType !== 'All' && driver.vehicleType !== vehicleType) {
        return false;
      }
      
      // Availability filter
      if (availability !== 'All' && driver.availability !== availability) {
        return false;
      }
      
      // Rating filter
      if (rating !== 'All') {
        const minRating = parseFloat(rating.replace('+', ''));
        if (driver.rating < minRating) {
          return false;
        }
      }
      
      return true;
    });
  }

  selectDriver(driver: Driver) {
    // Deselect all drivers
    this.availableDrivers.forEach(d => d.isSelected = false);
    this.filteredDrivers.forEach(d => d.isSelected = false);
    
    // Select the clicked driver
    driver.isSelected = true;
    this.selectedDriver = driver;
  }

  assignDriver() {
    if (!this.selectedDriver) {
      this.toastService.showError('Please select a driver first.');
      return;
    }

    if (!this.parcelDetails) {
      this.toastService.showError('No parcel details available.');
      return;
    }

    // Emit the assignment event
    this.driverAssigned.emit({
      parcelId: this.parcelDetails.id,
      driverId: this.selectedDriver.id
    });

    this.toastService.showSuccess(`Driver ${this.selectedDriver.name} assigned to parcel #${this.parcelDetails.id}`);
    
    // Redirect to a parcel that already has a driver assigned
    setTimeout(() => {
      // Redirect to a parcel that already has a driver (e.g., #12346 which has John Smith)
      this.router.navigate(['/admin-parcel-details', '#12346'], {
        state: { 
          assignedDriverId: this.selectedDriver?.id,
          newlyAssigned: true
        }
      });
    }, 1000); // Wait 1 second for the success message to be visible
  }

  getDriverStatusClass(availability: string): string {
    switch (availability) {
      case 'Available':
        return 'status-available';
      case 'Busy':
        return 'status-busy';
      case 'Offline':
        return 'status-offline';
      default:
        return '';
    }
  }

  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + (hasHalfStar ? '☆' : '') + '☆'.repeat(emptyStars);
  }

  goBack() {
    this.router.navigate(['/admin-manage-parcels']);
  }
} 