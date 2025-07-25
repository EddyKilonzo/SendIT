import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar';

interface DeliveryHistoryItem {
  id: string;
  parcelId: string;
  deliveryDate: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: 'Completed' | 'Canceled' | 'Failed';
  customerRating?: number;
  customerName?: string;
  completedTime?: string;
  notes?: string;
}

@Component({
  selector: 'app-delivery-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent],
  templateUrl: './delivery-history.html',
  styleUrls: ['./delivery-history.css']
})
export class DeliveryHistory implements OnInit {
  userRole: string = 'DRIVER';
  
  searchTerm = '';
  selectedStatus = 'all';
  selectedRating = 'all';
  
  showStatusDropdown = false;
  showRatingDropdown = false;
  
  currentPage = 1;
  itemsPerPage = 5;
  
  deliveryHistory: DeliveryHistoryItem[] = [
    {
      id: '1',
      parcelId: '123456',
      deliveryDate: '2024-01-15',
      pickupAddress: '123 Elm St, Anytown',
      deliveryAddress: '456 Oak Ave, Anytown',
      status: 'Completed',
      customerRating: 5,
      customerName: 'John Smith',
      completedTime: '10:30 AM',
      notes: 'Delivered successfully'
    },
    {
      id: '2',
      parcelId: '789012',
      deliveryDate: '2024-01-10',
      pickupAddress: '789 Pine Ln, Anytown',
      deliveryAddress: '101 Maple Dr, Anytown',
      status: 'Canceled',
      customerName: 'Jane Doe',
      notes: 'Customer requested cancellation'
    },
    {
      id: '3',
      parcelId: '345678',
      deliveryDate: '2024-01-05',
      pickupAddress: '222 Cedar Rd, Anytown',
      deliveryAddress: '333 Birch Ct, Anytown',
      status: 'Completed',
      customerRating: 4,
      customerName: 'Mike Johnson',
      completedTime: '2:15 PM',
      notes: 'Delivered to front door'
    },
    {
      id: '4',
      parcelId: '901234',
      deliveryDate: '2024-01-03',
      pickupAddress: '444 Spruce Way, Anytown',
      deliveryAddress: '555 Willow Place, Anytown',
      status: 'Completed',
      customerRating: 5,
      customerName: 'Sarah Wilson',
      completedTime: '11:45 AM',
      notes: 'Customer was very satisfied'
    },
    {
      id: '5',
      parcelId: '567890',
      deliveryDate: '2024-01-01',
      pickupAddress: '666 Aspen Circle, Anytown',
      deliveryAddress: '777 Poplar Street, Anytown',
      status: 'Failed',
      customerName: 'David Brown',
      notes: 'Address not found'
    },
    {
      id: '6',
      parcelId: '111222',
      deliveryDate: '2024-01-20',
      pickupAddress: '888 Pine Street, Anytown',
      deliveryAddress: '999 Oak Lane, Anytown',
      status: 'Completed',
      customerRating: 5,
      customerName: 'Emily Davis',
      completedTime: '3:20 PM',
      notes: 'Delivered to reception desk'
    }
  ];

  constructor(private router: Router) {}

  ngOnInit() {
    this.loadDeliveryHistory();
  }

  loadDeliveryHistory() {
    console.log('Loading delivery history...');
  }

  get filteredHistory(): DeliveryHistoryItem[] {
    let filtered = this.deliveryHistory;

    if (this.searchTerm) {
      const search = this.searchTerm.toLowerCase();
      filtered = filtered.filter(delivery => 
        delivery.parcelId.toLowerCase().includes(search) ||
        delivery.pickupAddress.toLowerCase().includes(search) ||
        delivery.deliveryAddress.toLowerCase().includes(search) ||
        (delivery.customerName && delivery.customerName.toLowerCase().includes(search))
      );
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(delivery => delivery.status === this.selectedStatus);
    }

    if (this.selectedRating !== 'all') {
      const rating = parseInt(this.selectedRating);
      filtered = filtered.filter(delivery => delivery.customerRating === rating);
    }

    return filtered;
  }

  get paginatedHistory(): DeliveryHistoryItem[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredHistory.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredHistory.length / this.itemsPerPage);
  }

  get pages(): number[] {
    const pages: number[] = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Completed': return 'status-completed';
      case 'Canceled': return 'status-canceled';
      case 'Failed': return 'status-failed';
      default: return '';
    }
  }

  getRatingStars(rating?: number): string {
    if (!rating) return '';
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  toggleStatusDropdown() {
    this.showStatusDropdown = !this.showStatusDropdown;
    this.showRatingDropdown = false;
  }

  toggleRatingDropdown() {
    this.showRatingDropdown = !this.showRatingDropdown;
    this.showStatusDropdown = false;
  }

  selectStatus(status: string) {
    this.selectedStatus = status;
    this.showStatusDropdown = false;
    this.currentPage = 1;
  }

  selectRating(rating: string) {
    this.selectedRating = rating;
    this.showRatingDropdown = false;
    this.currentPage = 1;
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedRating = 'all';
    this.showStatusDropdown = false;
    this.showRatingDropdown = false;
    this.currentPage = 1;
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  viewParcelDetails(deliveryId: string) {
    this.router.navigate(['/driver-parcel-details', deliveryId]);
  }

  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.filter-container')) {
      this.showStatusDropdown = false;
      this.showRatingDropdown = false;
    }
  }
} 