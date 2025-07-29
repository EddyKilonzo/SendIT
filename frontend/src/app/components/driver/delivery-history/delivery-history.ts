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
  status: 'delivered' | 'completed' | 'delivered_to_recipient' | 'cancelled';
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
    return parcels.map(parcel => {
      // Get the best rating from reviews (if any)
      let customerRating: number | undefined;
      
      if (parcel.reviews && Array.isArray(parcel.reviews) && parcel.reviews.length > 0) {
        // Get all valid ratings
        const ratings = parcel.reviews
          .map((review: any) => review.rating)
          .filter((rating: any) => typeof rating === 'number' && rating > 0 && rating <= 5);
        
        if (ratings.length > 0) {
          // Use the average rating instead of max for more accurate representation
          const averageRating = ratings.reduce((sum: number, rating: number) => sum + rating, 0) / ratings.length;
          customerRating = Math.round(averageRating * 10) / 10; // Round to 1 decimal place
        }
      }
      
      // Get completion time from status history or updated time
      let completedTime = this.formatDateTime(parcel.updatedAt);
      if (parcel.statusHistory && Array.isArray(parcel.statusHistory)) {
        const completedStatus = parcel.statusHistory.find((status: any) => 
          status.status === 'delivered' || 
          status.status === 'completed' || 
          status.status === 'delivered_to_recipient'
        );
        if (completedStatus?.timestamp) {
          completedTime = this.formatDateTime(completedStatus.timestamp);
        }
      }
      
      // Get customer name (recipient name)
      const customerName = parcel.recipientName || parcel.recipient?.name || 'Unknown Customer';
      
      return {
        id: parcel.id,
        trackingNumber: parcel.trackingNumber,
        pickupAddress: parcel.pickupAddress,
        deliveryAddress: parcel.deliveryAddress,
        status: parcel.status,
        customerRating,
        customerName,
        completedTime,
        notes: this.getCompletionNotes(parcel),
        createdAt: parcel.createdAt,
        updatedAt: parcel.updatedAt
      };
    });
  }

  getCompletionNotes(parcel: any): string {
    if (parcel.statusHistory && Array.isArray(parcel.statusHistory)) {
      const completedStatus = parcel.statusHistory.find((status: any) => 
        status.status === 'delivered' || 
        status.status === 'completed' || 
        status.status === 'delivered_to_recipient'
      );
      if (completedStatus?.notes) {
        return completedStatus.notes;
      }
    }
    
    // Default notes based on status
    switch (parcel.status) {
      case 'delivered':
        return 'Delivery completed successfully';
      case 'completed':
        return 'Delivery marked as complete';
      case 'delivered_to_recipient':
        return 'Delivered to recipient';
      default:
        return 'Delivery completed';
    }
  }

  formatDateTime(dateTime: string | Date | null | undefined): string {
    if (!dateTime) return 'N/A';
    
    try {
      const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
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
      case 'completed':
        return 'status-completed';
      case 'delivered_to_recipient':
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
      case 'completed':
        return 'Completed';
      case 'delivered_to_recipient':
        return 'Delivered to Recipient';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Delivered';
    }
  }

  getRatingStars(rating?: number): string {
    if (!rating) return '☆☆☆☆☆';
    
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '★'.repeat(fullStars) + 
           (hasHalfStar ? '★' : '') + 
           '☆'.repeat(emptyStars);
  }

  getRatingDisplay(rating?: number): string {
    if (!rating) return 'No rating';
    return `${rating}/5`;
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