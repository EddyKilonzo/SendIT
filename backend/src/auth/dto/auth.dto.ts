// Auth DTOs
export class RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
  address?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';

  // Driver application fields (only for DRIVER role)
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

export class LoginDto {
  email: string;
  password: string;
}

export class RefreshDto {
  refreshToken: string;
}

export class DriverApplicationDto {
  licenseNumber: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  reason?: string;
}

export class DriverApplicationResponseDto {
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
