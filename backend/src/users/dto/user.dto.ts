// Enhanced User DTOs
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  profilePicture?: string;

  // Driver-specific fields (only for DRIVER role)
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

export interface UpdateUserDto {
  name?: string;
  phone?: string;
  address?: string;
  email?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive?: boolean;
  profilePicture?: string;

  // Driver-specific fields (only for DRIVER role)
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  currentLat?: number;
  currentLng?: number;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateLocationDto {
  currentLat: number;
  currentLng: number;
  address?: string;
}

export interface DriverApplicationDto {
  licenseNumber: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  reason?: string;
}

export interface DriverApplicationResponseDto {
  id: string;
  email: string;
  name: string;
  driverApplicationStatus: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApplicationReason?: string;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  profilePicture?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;
  deletedAt?: Date;

  // Driver-specific fields (only for DRIVER role)
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  currentLat?: number;
  currentLng?: number;

  // Performance metrics (NEW)
  averageRating?: number;
  totalRatings: number;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime?: number; // in minutes
  onTimeDeliveryRate?: number; // percentage
  lastActiveAt?: Date;
  totalEarnings?: number;

  // Customer metrics (NEW)
  totalParcelsEverSent: number;
  totalParcelsReceived: number;
  preferredPaymentMethod?: string;

  // Driver application fields
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApplicationReason?: string;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface UserPerformanceMetricsDto {
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime?: number;
  onTimeDeliveryRate: number;
  averageRating: number;
  totalRatings: number;
  totalEarnings: number;
  recentActivity: Array<{
    date: Date;
    action: string;
    details: string;
  }>;
}

export interface UsersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive?: boolean;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  sortBy?: 'name' | 'email' | 'createdAt' | 'averageRating' | 'totalDeliveries';
  sortOrder?: 'asc' | 'desc';
  minimumRating?: number;
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
}

export interface AssignParcelDto {
  driverId: string;
  parcelId: string;
  assignmentNotes?: string;
  estimatedPickupTime?: Date;
  estimatedDeliveryTime?: Date;
}

export interface UpdateParcelStatusDto {
  status: 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  currentLocation?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}
