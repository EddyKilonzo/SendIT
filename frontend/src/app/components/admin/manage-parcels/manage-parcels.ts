import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ParcelsService, ParcelQueryDto } from '../../../services/parcels.service';
import { ToastService } from '../../shared/toast/toast.service';
import { Parcel } from '../../../services/base-api.service';

@Component({
  selector: 'app-manage-parcels',
  imports: [CommonModule, FormsModule, RouterModule, SidebarComponent],
  templateUrl: './manage-parcels.html',
  styleUrl: './manage-parcels.css'
})
export class ManageParcels implements OnInit {
  // User role for role-based access control
  userRole: string = 'ADMIN'; // Default role for admin component, will be set from auth service later
  

  
  searchTerm = '';
  selectedStatus = '';
  currentPage = 1;
  itemsPerPage = 10;
  parcels: Parcel[] = [];
  totalParcels = 0;
  loading = false;

  constructor(
    private router: Router,
    private parcelsService: ParcelsService,
    private toastService: ToastService
  ) {} 
  ngOnInit() {
    this.loadParcels();
  }

  loadParcels() {
    this.loading = true;
    
    const query: ParcelQueryDto = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchTerm || undefined,
      status: this.selectedStatus as any || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };

    this.parcelsService.getParcels(query).subscribe({
      next: (response: any) => {
        this.parcels = response.parcels;
        this.totalParcels = response.total;
        this.loading = false;
        console.log('Loaded parcels:', this.parcels);
      },
      error: (error: any) => {
        console.error('Error loading parcels:', error);
        this.loading = false;
        this.toastService.showError('Failed to load parcels');
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'assigned': return 'status-assigned';
      case 'picked_up': return 'status-picked';
      case 'in_transit': return 'status-transit';
      case 'delivered_to_recipient': return 'status-delivered';
      case 'delivered': return 'status-delivered';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'assigned': return 'Assigned';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered_to_recipient': return 'Delivered';
      case 'delivered': return 'Delivered';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
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
    this.currentPage = 1;
    this.loadParcels();
  }

  // Get paginated parcels (now using backend pagination)
  get paginatedParcels(): Parcel[] {
    return this.parcels;
  }

  // Get total pages (now using backend pagination)
  get totalPages(): number {
    return Math.ceil(this.totalParcels / this.itemsPerPage);
  }

  // Get page numbers to display
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  // Navigation methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadParcels();
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadParcels();
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadParcels();
    }
  }

  // Helper method for template
  get endIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalParcels);
  }

  // Search method
  onSearch() {
    this.currentPage = 1;
    this.loadParcels();
  }

  // Status filter method
  onStatusChange() {
    this.currentPage = 1;
    this.loadParcels();
  }


}
