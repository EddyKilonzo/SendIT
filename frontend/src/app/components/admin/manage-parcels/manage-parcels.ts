import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
// Removed: import { ApiService } from '../../../services/api.service';

interface Parcel {
  id: string;
  sender: string;
  receiver: string;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
  expectedDelivery: string;
  driver?: string;
}

@Component({
  selector: 'app-manage-parcels',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './manage-parcels.html',
  styleUrl: './manage-parcels.css'
})
export class ManageParcels implements OnInit {
  // User role for role-based access control
  userRole: string = 'ADMIN'; // Default role for admin component, will be set from auth service later
  
  searchTerm = '';
  selectedStatus = '';
  selectedFilter = '';
  parcels: Parcel[] = [
    { id: '#12345', sender: 'Olivia Bennett', receiver: 'Ethan Carter', status: 'Pending', expectedDelivery: '2024-07-20', driver: 'Unassigned' },
    { id: '#12346', sender: 'Noah Foster', receiver: 'Sophia Green', status: 'In Transit', expectedDelivery: '2024-07-21', driver: 'John Smith' },
    { id: '#12347', sender: 'Lucas Hayes', receiver: 'Isabella Ingram', status: 'Delivered', expectedDelivery: '2024-07-19', driver: 'Mike Johnson' },
    { id: '#12348', sender: 'Emily King', receiver: 'Jacob Lewis', status: 'Pending', expectedDelivery: '2024-07-22', driver: 'Unassigned' },
    { id: '#12349', sender: 'Chloe Morgan', receiver: 'Caleb Nelson', status: 'In Transit', expectedDelivery: '2024-07-23', driver: 'Sarah Wilson' },
    { id: '#12350', sender: 'Ava Parker', receiver: 'Owen Quinn', status: 'Delivered', expectedDelivery: '2024-07-18', driver: 'David Brown' },
    { id: '#12351', sender: 'Ryan Roberts', receiver: 'Mia Scott', status: 'Pending', expectedDelivery: '2024-07-24', driver: 'Unassigned' },
    { id: '#12352', sender: 'Daniel Turner', receiver: 'Harper Upton', status: 'In Transit', expectedDelivery: '2024-07-25', driver: 'Lisa Davis' },
    { id: '#12353', sender: 'Aiden Vance', receiver: 'Abigail Walker', status: 'Delivered', expectedDelivery: '2024-07-17', driver: 'Tom Miller' },
    { id: '#12354', sender: 'Jackson Young', receiver: 'Liam Zane', status: 'Pending', expectedDelivery: '2024-07-26', driver: 'Unassigned' },
    { id: '#12355', sender: 'Emma Davis', receiver: 'Frank Miller', status: 'Cancelled', expectedDelivery: '2024-07-19', driver: 'Unassigned' }
  ];
  loading = false;

  constructor(private router: Router) {} // Removed ApiService injection

  ngOnInit() {
    this.loadParcels();
  }

  loadParcels() {
    this.loading = true;
    // Use dummy data for now
    setTimeout(() => {
      this.parcels = [
        { id: '#12345', sender: 'Olivia Bennett', receiver: 'Ethan Carter', status: 'Pending', expectedDelivery: '2024-07-20', driver: 'Unassigned' },
        { id: '#12346', sender: 'Noah Foster', receiver: 'Sophia Green', status: 'In Transit', expectedDelivery: '2024-07-21', driver: 'John Smith' },
        { id: '#12347', sender: 'Lucas Hayes', receiver: 'Isabella Ingram', status: 'Delivered', expectedDelivery: '2024-07-19', driver: 'Mike Johnson' },
        { id: '#12348', sender: 'Emily King', receiver: 'Jacob Lewis', status: 'Pending', expectedDelivery: '2024-07-22', driver: 'Unassigned' },
        { id: '#12349', sender: 'Chloe Morgan', receiver: 'Caleb Nelson', status: 'In Transit', expectedDelivery: '2024-07-23', driver: 'Sarah Wilson' },
        { id: '#12350', sender: 'Ava Parker', receiver: 'Owen Quinn', status: 'Delivered', expectedDelivery: '2024-07-18', driver: 'David Brown' },
        { id: '#12351', sender: 'Ryan Roberts', receiver: 'Mia Scott', status: 'Pending', expectedDelivery: '2024-07-24', driver: 'Unassigned' },
        { id: '#12352', sender: 'Daniel Turner', receiver: 'Harper Upton', status: 'In Transit', expectedDelivery: '2024-07-25', driver: 'Lisa Davis' },
        { id: '#12353', sender: 'Aiden Vance', receiver: 'Abigail Walker', status: 'Delivered', expectedDelivery: '2024-07-17', driver: 'Tom Miller' },
        { id: '#12354', sender: 'Jackson Young', receiver: 'Liam Zane', status: 'Pending', expectedDelivery: '2024-07-26', driver: 'Unassigned' },
        { id: '#12355', sender: 'Emma Davis', receiver: 'Frank Miller', status: 'Cancelled', expectedDelivery: '2024-07-19', driver: 'Unassigned' }
      ];
      this.loading = false;
    }, 500); // Simulate loading delay
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

  viewDetails(parcelId: string) {
    this.router.navigate(['/admin-parcel-details', parcelId]);
  }

  createNewParcel() {
    console.log('Create new parcel');
    
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedFilter = '';
  }

  // Filter parcels based on search term and status
  get filteredParcels(): Parcel[] {
    let filtered = this.parcels;

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(parcel => 
        parcel.id.toLowerCase().includes(search) ||
        parcel.sender.toLowerCase().includes(search) ||
        parcel.receiver.toLowerCase().includes(search)
      );
    }

    if (this.selectedStatus) {
      filtered = filtered.filter(parcel => parcel.status === this.selectedStatus);
    }

    return filtered;
  }
}
