import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../shared/sidebar/sidebar';
import { ParcelsService } from '../../../services/parcels.service';
import { ToastService } from '../../shared/toast/toast.service';

interface DeliveryHistoryItem {
  id: string;
  trackingNumber: string;
  pickupAddress: string;
  deliveryAddress: string;
  status: 'delivered' | 'cancelled';
  customerRating?: number;
  customerName?: string;
  completedTime?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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
  itemsPerPage = 6;
  
  deliveryHistory: DeliveryHistoryItem[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private parcelsService: ParcelsService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadDeliveryHistory();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    
    // Check if click is outside status dropdown
    if (!target.closest('.filter-container') || !target.closest('.status-dropdown')) {
      this.showStatusDropdown = false;
    }
    
    // Check if click is outside rating dropdown
    if (!target.closest('.filter-container') || !target.closest('.rating-dropdown')) {
      this.showRatingDropdown = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.showStatusDropdown = false;
    this.showRatingDropdown = false;
  }

  loadDeliveryHistory() {
    this.isLoading = true;
    this.error = null;

    this.parcelsService.getDriverDeliveryHistory().subscribe({
      next: (parcels) => {
        this.deliveryHistory = this.mapParcelsToHistory(parcels);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading delivery history:', error);
        this.error = 'Failed to load delivery history';
        this.isLoading = false;
        this.toastService.showError('Failed to load delivery history');
      }
    });
  }

  mapParcelsToHistory(parcels: any[]): DeliveryHistoryItem[] {
    return parcels.map(parcel => ({
      id: parcel.id,
      trackingNumber: parcel.trackingNumber,
      pickupAddress: parcel.pickupAddress,
      deliveryAddress: parcel.deliveryAddress,
      status: parcel.status,
      customerRating: parcel.reviews?.[0]?.rating,
      customerName: parcel.recipientName,
      completedTime: new Date(parcel.updatedAt).toLocaleTimeString(),
      notes: parcel.statusHistory?.[0]?.notes || 'Delivery completed',
      createdAt: parcel.createdAt,
      updatedAt: parcel.updatedAt
    }));
  }

  get filteredHistory(): DeliveryHistoryItem[] {
    let filtered = this.deliveryHistory;

    // Apply search filter
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.trackingNumber.toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.pickupAddress.toLowerCase().includes(searchLower) ||
        item.deliveryAddress.toLowerCase().includes(searchLower)
      );
    }

    // Apply status filter
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.status === this.selectedStatus);
    }

    // Apply rating filter
    if (this.selectedRating !== 'all') {
      const ratingValue = parseInt(this.selectedRating);
      filtered = filtered.filter(item => item.customerRating === ratingValue);
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
    const totalPages = this.totalPages;
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
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-delivered';
    }
  }

  getStatusDisplayName(status: string): string {
    switch (status) {
      case 'delivered':
        return 'Delivered';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Delivered';
    }
  }

  getRatingStars(rating?: number): string {
    if (!rating) return '☆☆☆☆☆';
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
    this.currentPage = 1; // Reset to first page when filter changes
  }

  selectRating(rating: string) {
    this.selectedRating = rating;
    this.showRatingDropdown = false;
    this.currentPage = 1; // Reset to first page when filter changes
  }

  clearFilters() {
    this.searchTerm = '';
    this.selectedStatus = 'all';
    this.selectedRating = 'all';
    this.currentPage = 1;
    this.showStatusDropdown = false;
    this.showRatingDropdown = false;
  }

  hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || 
           this.selectedStatus !== 'all' || 
           this.selectedRating !== 'all';
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
    this.router.navigate(['/driver/parcel-details', deliveryId]);
  }

  get startItem(): number {
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredHistory.length);
  }
} 