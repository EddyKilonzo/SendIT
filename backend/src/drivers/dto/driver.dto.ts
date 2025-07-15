import { VehicleType } from '@prisma/client';

export class CreateDriverDto {
  email: string;
  password: string;
  name: string;
  phone: string;
  licenseNumber: string;
  vehicleNumber?: string;
  vehicleType?: VehicleType;
}

export class UpdateDriverDto {
  name?: string;
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: VehicleType;
  isActive?: boolean;
  isAvailable?: boolean;
  currentLat?: number;
  currentLng?: number;
}

export class UpdateLocationDto {
  currentLat: number;
  currentLng: number;
}

export class UpdateAvailabilityDto {
  isAvailable: boolean;
}

export class DriverProfileDto {
  id: string;
  name: string;
  email: string;
  phone?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  isAvailable: boolean;
  currentLat?: number;
  currentLng?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateDriverProfileDto {
  name?: string;
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

export class ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export class UpdateParcelStatusDto {
  status: 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  currentLocation?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export class DriverParcelDto {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  pickupAddress: string;
  deliveryAddress: string;
  status:
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'cancelled';
  weight: number;
  description?: string;
  deliveryInstructions?: string;
  assignedAt?: Date;
  createdAt: Date;
}

export class DriverStatsDto {
  totalAssignedParcels: number;
  completedDeliveries: number;
  pendingDeliveries: number;
  inTransitDeliveries: number;
  averageDeliveryTime: number; // in hours
  totalEarnings: number;
  currentLocation?: {
    lat: number;
    lng: number;
  };
}

export class DriverQueryDto {
  page?: number = 1;
  limit?: number = 10;
  status?:
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
}

export class AssignParcelDto {
  driverId: string;
  parcelId: string;
}

export class DriversQueryDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  vehicleType?: VehicleType;
}
