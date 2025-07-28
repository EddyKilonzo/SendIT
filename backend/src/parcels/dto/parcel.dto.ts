// Parcel DTOs
export interface CreateParcelDto {
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
  // Note: deliveryFee is calculated automatically and not included in the DTO
}

export interface UpdateParcelDto {
  description?: string;
  value?: number;
  deliveryInstructions?: string;
  notes?: string;
}

export interface ParcelQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?:
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered_to_recipient'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  assignedToMe?: boolean;
}

export interface ParcelStatusUpdateDto {
  status:
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered_to_recipient'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  currentLocation?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface DeliveryConfirmationDto {
  customerSignature?: string;
  customerNotes?: string;
}

export interface MarkAsCompletedDto {
  customerNotes?: string;
}

export interface ParcelResponseDto {
  id: string;
  trackingNumber: string;
  senderId?: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  driverId?: string;
  assignedAt?: Date;
  pickupAddress: string;
  deliveryAddress: string;
  currentLocation?: string;
  status:
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered_to_recipient'
    | 'delivered'
    | 'completed'
    | 'cancelled';
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  estimatedPickupTime?: Date;
  actualPickupTime?: Date;
  estimatedDeliveryTime?: Date;
  actualDeliveryTime?: Date;
  totalDeliveryTime?: number;
  deliveryAttempts: number;
  deliveryFee?: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  deliveredToRecipient: boolean;
  deliveryConfirmedAt?: Date;
  deliveryConfirmedBy?: string;
  customerSignature?: string;
  customerNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  sender?: UserResponseDto;
  recipient?: UserResponseDto;
  driver?: UserResponseDto;
  statusHistory?: any[];
  reviews?: any[];
  deliveryProof?: any;
}

// Import UserResponseDto interface
export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  isAvailable?: boolean;
  currentLat?: number;
  currentLng?: number;
  averageRating?: number;
  totalRatings?: number;
  totalDeliveries?: number;
  completedDeliveries?: number;
  cancelledDeliveries?: number;
  averageDeliveryTime?: number;
  onTimeDeliveryRate?: number;
  lastActiveAt?: Date;
  totalEarnings?: number;
  totalParcelsEverSent?: number;
  totalParcelsReceived?: number;
  preferredPaymentMethod?: string;
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
