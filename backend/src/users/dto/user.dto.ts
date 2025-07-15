// User DTOs
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';

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

  // Driver-specific fields (only for DRIVER role)
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  isAvailable?: boolean;
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
}

export interface UpdateAvailabilityDto {
  isAvailable: boolean;
}

export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive: boolean;

  // Driver-specific fields (only for DRIVER role)
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  isAvailable?: boolean;
  currentLat?: number;
  currentLng?: number;

  // Driver application fields
  driverApplicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface UsersQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive?: boolean;
  isAvailable?: boolean;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  driverApplicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  sortBy?: 'name' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AssignParcelDto {
  driverId: string;
  parcelId: string;
  assignmentNotes?: string;
}

export interface UpdateParcelStatusDto {
  status: 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  currentLocation?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
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
  driverApplicationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}
