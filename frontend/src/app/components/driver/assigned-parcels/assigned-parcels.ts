import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ParcelsService } from '../../../services/parcels.service';
import { ToastService } from '../../shared/toast/toast.service';

interface AssignedParcel {
  id: string;
  trackingNumber: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered_to_recipient' | 'delivered' | 'completed' | 'cancelled';
  scheduledTime?: string;
  customerName?: string;
  customerPhone?: string;
  weight?: number;
  specialInstructions?: string;
  assignedDate: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-assigned-parcels',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SidebarComponent],
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
  
  assignedParcels: AssignedParcel[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;

  constructor(
    private router: Router,
    private parcelsService: ParcelsService,
    private toastService: ToastService
  ) {}

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
    this.isLoading = true;
    this.error = null;

    this.parcelsService.getDriverParcels().subscribe({
      next: (parcels) => {
        this.assignedParcels = this.mapParcelsToAssignedParcels(parcels);
        this.totalItems = this.assignedParcels.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading assigned parcels:', error);
        this.error = 'Failed to load assigned parcels';
        this.isLoading = false;
        this.toastService.showError('Failed to load assigned parcels');
      }
    });
  }

  mapParcelsToAssignedParcels(parcels: any[]): AssignedParcel[] {
    return parcels.map(parcel => ({
      id: parcel.id,
      trackingNumber: parcel.trackingNumber,
      pickupAddress: parcel.pickupAddress,
      deliveryAddress: parcel.deliveryAddress,
      status: parcel.status,
      scheduledTime: this.formatTime(parcel.createdAt),
      customerName: parcel.recipientName,
      customerPhone: parcel.recipientPhone,
      weight: parcel.weight,
      specialInstructions: parcel.deliveryInstructions,
      assignedDate: this.formatDate(parcel.assignedAt || parcel.createdAt),
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt
    }));
  }

  formatTime(dateString: string): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } catch (error) {
      return 'N/A';
    }
  }

  formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return 'N/A';
    
    try {
      const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
      if (isNaN(date.getTime())) return 'N/A';
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  get filteredParcels(): AssignedParcel[] {
    let filtered = this.assignedParcels;

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(parcel =>
        parcel.trackingNumber.toLowerCase().includes(searchLower) ||
        parcel.customerName?.toLowerCase().includes(searchLower) ||
        parcel.pickupAddress.toLowerCase().includes(searchLower) ||
        parcel.deliveryAddress.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (this.selectedFilter !== 'all') {
      filtered = filtered.filter(parcel => parcel.status === this.selectedFilter);
    }

    return filtered;
  }

  get paginatedParcels(): AssignedParcel[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredParcels.slice(startIndex, endIndex);
  }

  get totalFilteredItems(): number {
    return this.filteredParcels.length;
  }

  get totalFilteredPages(): number {
    return Math.ceil(this.totalFilteredItems / this.itemsPerPage);
  }

  get pages(): number[] {
    const pages: number[] = [];
    const totalPages = this.totalFilteredPages;
    const currentPage = this.currentPage;
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'assigned':
        return 'status-assigned';
      case 'picked_up':
        return 'status-picked-up';
      case 'in_transit':
        return 'status-in-transit';
      case 'delivered_to_recipient':
        return 'status-delivered';
      case 'delivered':
        return 'status-delivered';
      case 'completed':
        return 'status-completed';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'assigned':
        return 'Assigned';
      case 'picked_up':
        return 'Picked Up';
      case 'in_transit':
        return 'In Transit';
      case 'delivered_to_recipient':
        return 'Delivered to Recipient';
      case 'delivered':
        return 'Delivered';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Pending';
    }
  }

  toggleFilterDropdown() {
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  selectFilter(filter: string) {
    this.selectedFilter = filter;
    this.showFilterDropdown = false;
    this.currentPage = 1; // Reset to first page when filter changes
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedFilter = 'all';
    this.currentPage = 1;
  }

  hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || this.selectedFilter !== 'all';
  }

  clearSearch() {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  refreshPage() {
    this.loadAssignedParcels();
    this.toastService.showSuccess('Page refreshed successfully');
  }

  viewParcelDetails(parcelId: string) {
    this.router.navigate(['/driver/parcel-details', parcelId]);
  }

  startDelivery(parcelId: string) {
    this.parcelsService.updateParcelStatus(parcelId, {
      status: 'in_transit',
      notes: 'Delivery started by driver'
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Delivery started successfully');
        this.loadAssignedParcels(); // Reload data
      },
      error: (error) => {
        console.error('Error starting delivery:', error);
        this.toastService.showError('Failed to start delivery');
      }
    });
  }

  completeDelivery(parcelId: string) {
    this.parcelsService.updateParcelStatus(parcelId, {
      status: 'delivered',
      notes: 'Delivery completed by driver'
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Delivery completed successfully');
        this.loadAssignedParcels(); // Reload data
      },
      error: (error) => {
        console.error('Error completing delivery:', error);
        this.toastService.showError('Failed to complete delivery');
      }
    });
  }

  // Pagination methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalFilteredPages) {
      this.currentPage = page;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalFilteredPages) {
      this.currentPage++;
    }
  }

  get startItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalFilteredItems);
  }
}
