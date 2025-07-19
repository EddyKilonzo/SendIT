import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../shared/toast/toast.service';

interface Parcel {
  id: string;
  weight: number;
  status: 'Pending' | 'In Transit' | 'Delivered' | 'Cancelled';
  pickupAddress: string;
  deliveryAddress: string;
  expectedDelivery: string;
  deliveredDate?: string;
  scheduledPickup?: string;
  type: 'sent' | 'received';
  description?: string;
  senderName?: string;
  receiverName?: string;
  trackingNumber?: string;
  currentLocation?: string;
  estimatedTime?: string;
}

interface TrackingEvent {
  id: string;
  status: string;
  location: string;
  timestamp: string;
  description: string;
  icon: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  date: string;
  userName: string;
}

@Component({
  selector: 'app-parcel-details',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './parcel-details.html',
  styleUrls: ['./parcel-details.css']
})
export class ParcelDetails implements OnInit {
  parcelId: string = '';
  parcel: Parcel | null = null;
  showReviewModal = false;
  
  reviewRating = 5;
  reviewComment = '';
  hasUserReviewed = false;
  userReview: Review | null = null;
  isEditingReview = false;
  
  // User role for role-based access control
  userRole: string = 'CUSTOMER'; // Default role, will be set from auth service later
  
  parcels: Parcel[] = [
    {
      id: '#12345',
      weight: 2,
      status: 'In Transit',
      pickupAddress: '123 Maple Street, Anytown',
      deliveryAddress: '456 Oak Avenue, Anytown',
      expectedDelivery: '2024-07-20',
      type: 'sent',
      description: 'Electronics package containing laptop and accessories',
      senderName: 'John Doe',
      receiverName: 'Jane Smith',
      trackingNumber: 'TRK123456789',
      currentLocation: 'Distribution Center, Downtown',
      estimatedTime: '2 hours'
    },
    {
      id: '#11223',
      weight: 3,
      status: 'Pending',
      pickupAddress: '322 Cedar Drive, Anytown',
      deliveryAddress: '333 Birch Court, Anytown',
      expectedDelivery: '2024-07-22',
      scheduledPickup: '2024-07-22',
      type: 'sent',
      description: 'Heavy machinery parts for construction project',
      senderName: 'John Doe',
      receiverName: 'Construction Co.',
      trackingNumber: 'TRK112233445',
      currentLocation: 'Pending Pickup',
      estimatedTime: 'TBD'
    },
    {
      id: '#44508',
      weight: 2.5,
      status: 'In Transit',
      pickupAddress: '444 Spruce Way, Anytown',
      deliveryAddress: '555 Willow Place, Anytown',
      expectedDelivery: '2024-07-21',
      type: 'sent',
      description: 'Medical supplies and equipment',
      senderName: 'John Doe',
      receiverName: 'City Hospital',
      trackingNumber: 'TRK445566778',
      currentLocation: 'Regional Hub',
      estimatedTime: '1 day'
    },
    {
      id: '#77889',
      weight: 1,
      status: 'Delivered',
      pickupAddress: '890 Aspen Circle, Anytown',
      deliveryAddress: '777 Redwood Boulevard, Anytown',
      expectedDelivery: '2024-07-18',
      deliveredDate: '2024-07-18',
      type: 'sent',
      description: 'Documents and legal papers',
      senderName: 'John Doe',
      receiverName: 'Law Office',
      trackingNumber: 'TRK778899001',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#67890',
      weight: 1.5,
      status: 'Delivered',
      pickupAddress: '789 Pine Lane, Anytown',
      deliveryAddress: '101 Elm Road, Anytown',
      expectedDelivery: '2024-07-15',
      deliveredDate: '2024-07-15',
      type: 'sent',
      description: 'Clothing package - Summer collection',
      senderName: 'John Doe',
      receiverName: 'Mike Johnson',
      trackingNumber: 'TRK987654321',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#99887',
      weight: 2.5,
      status: 'Delivered',
      pickupAddress: '666 Oak Drive, Anytown',
      deliveryAddress: '777 Maple Street, Anytown',
      expectedDelivery: '2024-07-10',
      deliveredDate: '2024-07-10',
      type: 'received',
      description: 'Home appliances and electronics',
      senderName: 'Electronics Store',
      receiverName: 'John Doe',
      trackingNumber: 'TRK998877665',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#55443',
      weight: 0.8,
      status: 'Delivered',
      pickupAddress: '111 Cedar Lane, Anytown',
      deliveryAddress: '222 Birch Road, Anytown',
      expectedDelivery: '2024-07-05',
      deliveredDate: '2024-07-05',
      type: 'received',
      description: 'Books and educational materials',
      senderName: 'Online Bookstore',
      receiverName: 'John Doe',
      trackingNumber: 'TRK554433221',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    },
    {
      id: '#33221',
      weight: 1.2,
      status: 'Delivered',
      pickupAddress: '333 Pine Avenue, Anytown',
      deliveryAddress: '444 Elm Lane, Anytown',
      expectedDelivery: '2024-07-01',
      deliveredDate: '2024-07-01',
      type: 'received',
      description: 'Garden supplies and tools',
      senderName: 'Garden Center',
      receiverName: 'John Doe',
      trackingNumber: 'TRK332211009',
      currentLocation: 'Delivered',
      estimatedTime: 'Delivered'
    }
  ];

  trackingEvents: TrackingEvent[] = [];



  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.parcelId = this.route.snapshot.params['id'];
    this.loadParcelDetails();
  }

  loadParcelDetails() {
    this.parcel = this.parcels.find(p => p.id === this.parcelId) || null;
    if (!this.parcel) {
      this.router.navigate(['/user-parcels']);
    } else {
      this.generateTrackingEvents();
      
      if (this.parcel.status === 'Delivered') {
        this.checkUserReview();
      }
    }
  }

  checkUserReview() {
    this.hasUserReviewed = false;
    this.userReview = null;
  }

  generateTrackingEvents() {
    if (!this.parcel) return;

    this.trackingEvents = [];
    const baseDate = new Date(this.parcel.expectedDelivery);
    
    this.trackingEvents.push({
      id: '1',
      status: 'Order Placed',
      location: 'Anytown',
      timestamp: this.formatDate(new Date(baseDate.getTime() - 7 * 24 * 60 * 60 * 1000)),
      description: 'Parcel order has been placed and confirmed',
      icon: 'fas fa-shopping-cart'
    });

    switch (this.parcel.status) {
      case 'Pending':
        break;
        
      case 'In Transit':
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        
        this.trackingEvents.push({
          id: '3',
          status: 'In Transit',
          location: this.parcel.currentLocation || 'Distribution Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is in transit to destination',
          icon: 'fas fa-truck'
        });
        break;
        
      case 'Delivered':
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        
        this.trackingEvents.push({
          id: '3',
          status: 'In Transit',
          location: 'Distribution Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 3 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is in transit to destination',
          icon: 'fas fa-truck'
        });
        
        this.trackingEvents.push({
          id: '4',
          status: 'Out for Delivery',
          location: 'Local Facility',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000)),
          description: 'Parcel is out for delivery',
          icon: 'fas fa-motorcycle'
        });
        
        this.trackingEvents.push({
          id: '5',
          status: 'Delivered',
          location: this.parcel.deliveryAddress,
          timestamp: this.formatDate(new Date(this.parcel.deliveredDate || baseDate)),
          description: 'Parcel has been successfully delivered',
          icon: 'fas fa-check-circle'
        });
        break;
        
      case 'Cancelled':
        this.trackingEvents.push({
          id: '2',
          status: 'Picked Up',
          location: this.parcel.pickupAddress,
          timestamp: this.formatDate(new Date(baseDate.getTime() - 5 * 24 * 60 * 60 * 1000)),
          description: 'Parcel has been picked up from sender',
          icon: 'fas fa-box'
        });
        
        this.trackingEvents.push({
          id: '3',
          status: 'Cancelled',
          location: 'Service Center',
          timestamp: this.formatDate(new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000)),
          description: 'Parcel delivery has been cancelled',
          icon: 'fas fa-times-circle'
        });
        break;
    }
  }

  formatDate(date: Date): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
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

  getTrackingEventClass(event: TrackingEvent): string {
    switch (event.status) {
      case 'Order Placed': return 'event-placed';
      case 'Picked Up': return 'event-picked';
      case 'In Transit': return 'event-transit';
      case 'Out for Delivery': return 'event-delivery';
      case 'Delivered': return 'event-delivered';
      case 'Cancelled': return 'event-cancelled';
      default: return '';
    }
  }

  openReviewModal() {
    this.isEditingReview = false;
    this.showReviewModal = true;
    this.reviewRating = 5;
    this.reviewComment = '';
  }

  openEditReviewModal() {
    this.isEditingReview = true;
    this.showReviewModal = true;
    if (this.userReview) {
      this.reviewRating = this.userReview.rating;
      this.reviewComment = this.userReview.comment;
    }
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.isEditingReview = false;
    this.reviewRating = 5;
    this.reviewComment = '';
  }

  submitReview() {
    if (this.reviewRating && this.reviewComment.trim()) {
      const newReview: Review = {
        id: Date.now().toString(),
        rating: this.reviewRating,
        comment: this.reviewComment,
        date: new Date().toISOString().split('T')[0],
        userName: 'You'
      };
      
      this.userReview = newReview;
      this.hasUserReviewed = true;
      this.showReviewModal = false;
      this.reviewRating = 5;
      this.reviewComment = '';
      
      this.toastService.showSuccess('Review submitted successfully!');
    }
  }

  updateReview() {
    if (this.reviewRating && this.reviewComment.trim() && this.userReview) {
      this.userReview.rating = this.reviewRating;
      this.userReview.comment = this.reviewComment;
      this.userReview.date = new Date().toISOString().split('T')[0]; // Update date to current date
      
      this.showReviewModal = false;
      this.isEditingReview = false;
      this.reviewRating = 5;
      this.reviewComment = '';
      
      this.toastService.showSuccess('Review updated successfully!');
    }
  }

  deleteReview() {
    this.userReview = null;
    this.hasUserReviewed = false;
    this.showReviewModal = false;
    this.isEditingReview = false;
    this.reviewRating = 5;
    this.reviewComment = '';
    
    this.toastService.showSuccess('Review deleted successfully!');
  }

  getStarClass(rating: number, starIndex: number): string {
    return starIndex <= rating ? 'fas fa-star filled' : 'far fa-star';
  }

  goBack() {
    this.router.navigate(['/user-parcels']);
  }
} 