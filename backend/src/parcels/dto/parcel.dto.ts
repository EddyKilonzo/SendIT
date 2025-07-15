// Parcel DTOs
export interface CreateParcelDto {
  // Sender info (if current user is sender, these are optional)
  senderName?: string;
  senderEmail?: string;
  senderPhone?: string;
  senderId?: string; // Optional: if sender is a registered user

  // Recipient info
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;
  recipientId?: string; // Optional: if recipient is a registered user

  pickupAddress: string;
  deliveryAddress: string;
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
}

export interface UpdateParcelDto {
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
  weight?: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
}

export interface UpdateParcelStatusDto {
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  notes?: string;
}

export interface UpdateParcelLocationDto {
  currentLocation: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface ParcelResponseDto {
  id: string;
  trackingNumber: string;

  // Sender info
  senderId?: string;
  senderName: string;
  senderEmail: string;
  senderPhone: string;

  // Recipient info
  recipientId?: string;
  recipientName: string;
  recipientEmail: string;
  recipientPhone: string;

  pickupAddress: string;
  deliveryAddress: string;
  currentLocation: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  weight: number;
  description?: string;
  value?: number;
  deliveryInstructions?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParcelsQueryDto {
  page?: number;
  limit?: number;
  status?: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  search?: string;
  sortBy?: 'createdAt' | 'status' | 'weight';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
}
