import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface AssignedParcel {
  id: string;
  parcelId: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
  scheduledTime?: string;
  customerName?: string;
  customerPhone?: string;
  weight?: number;
  specialInstructions?: string;
  assignedDate: string;
}

@Component({
  selector: 'app-assigned-parcels',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './assigned-parcels.html',
  styleUrls: ['./assigned-parcels.css']
})
export class AssignedParcels implements OnInit {
  // User role for role-based access control
  userRole: string = 'DRIVER'; // Default role for driver component, 
  
  searchTerm = '';
  selectedFilter = 'all';
  showFilterDropdown = false;
  selectedParcelId: string | null = null;
  
  assignedParcels: AssignedParcel[] = [
    {
      id: '1',
      parcelId: '#12345',
      pickupAddress: '123 Elm Street, Anytown',
      deliveryAddress: '456 Oak Avenue, Anytown',
      status: 'Pending',
      scheduledTime: '10:00 AM',
      customerName: 'John Smith',
      customerPhone: '+1-555-123-4567',
      weight: 2.5,
      specialInstructions: 'Please call before delivery',
      assignedDate: '2024-07-20'
    },
    {
      id: '2',
      parcelId: '#67890',
      pickupAddress: '789 Pine Lane, Anytown',
      deliveryAddress: '101 Maple Drive, Anytown',
      status: 'In Transit',
      scheduledTime: '11:30 AM',
      customerName: 'Jane Doe',
      customerPhone: '+1-555-987-6543',
      weight: 1.8,
      specialInstructions: 'Leave at front door if no answer',
      assignedDate: '2024-07-20'
    },
    {
      id: '3',
      parcelId: '#24680',
      pickupAddress: '222 Cedar Road, Anytown',
      deliveryAddress: '333 Birch Court, Anytown',
      status: 'Pending',
      scheduledTime: '1:00 PM',
      customerName: 'Mike Johnson',
      customerPhone: '+1-555-456-7890',
      weight: 3.2,
      specialInstructions: 'Ring doorbell twice',
      assignedDate: '2024-07-20'
    },
    {
      id: '5',
      parcelId: '#98765',
      pickupAddress: '666 Aspen Circle, Anytown',
      deliveryAddress: '777 Poplar Street, Anytown',
      status: 'Pending',
      scheduledTime: '3:45 PM',
      customerName: 'David Brown',
      customerPhone: '+1-555-321-6540',
      weight: 4.0,
      specialInstructions: 'Heavy package, use elevator',
      assignedDate: '2024-07-20'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadAssignedParcels();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-container')) {
      this.showFilterDropdown = false;
    }
  }

  loadAssignedParcels() {
    // This would typically load from a service
    console.log('Loading assigned parcels...');
  }

  get filteredParcels(): AssignedParcel[] {
    let filtered = this.assignedParcels;

    // Filter out delivered parcels - they should go to history
    filtered = filtered.filter(parcel => parcel.status !== 'Delivered');

    // Apply search filter
    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(parcel => 
        parcel.parcelId.toLowerCase().includes(search) ||
        parcel.pickupAddress.toLowerCase().includes(search) ||
        parcel.deliveryAddress.toLowerCase().includes(search) ||
        (parcel.customerName && parcel.customerName.toLowerCase().includes(search))
      );
    }

    // Apply status filter
    if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(parcel => {
        switch (this.selectedFilter) {
          case 'pending':
            return parcel.status === 'Pending';
          case 'in-transit':
            return parcel.status === 'In Transit';
          default:
            return true;
        }
      });
    }

    return filtered;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'In Transit': return 'status-transit';
      case 'Delivered': return 'status-delivered';
      case 'Cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.showFilterDropdown = false;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedFilter = 'all';
    this.showFilterDropdown = false;
  }

  hasActiveFilters(): boolean {
    return this.searchTerm !== '' || this.selectedFilter !== 'all';
  }

  clearSearch() {
    this.searchTerm = '';
  }

  viewParcelDetails(parcelId: string) {
    this.selectedParcelId = parcelId;
    this.router.navigate(['/driver-parcel-details', parcelId]);
  }

  startDelivery(parcelId: string) {
    console.log('Starting delivery for parcel:', parcelId);
    // This would update the parcel status to 'In Transit'
    const parcel = this.assignedParcels.find(p => p.id === parcelId);
    if (parcel) {
      parcel.status = 'In Transit';
    }
  }

  completeDelivery(parcelId: string) {
    console.log('Completing delivery for parcel:', parcelId);
    // This would update the parcel status to 'Delivered' and move to history
    const parcel = this.assignedParcels.find(p => p.id === parcelId);
    if (parcel) {
      parcel.status = 'Delivered';
      // In a real application, this would trigger a service call to move the parcel to history
      // and remove it from the assigned parcels list
      console.log('Parcel completed and moved to history:', parcel.parcelId);
    }
  }
}
