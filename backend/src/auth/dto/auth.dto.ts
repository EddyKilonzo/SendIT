import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

// Auth DTOs
export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters' })
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[\d\s\-()]+$/, {
    message: 'Please provide a valid phone number',
  })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Address cannot exceed 200 characters' })
  address?: string;

  @IsOptional()
  @IsEnum(['CUSTOMER', 'DRIVER', 'ADMIN'], {
    message: 'Role must be either CUSTOMER, DRIVER, or ADMIN',
  })
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';

  // Driver application fields (only for DRIVER role)
  @IsOptional()
  @IsString()
  @MinLength(5, {
    message: 'License number must be at least 5 characters long',
  })
  @MaxLength(20, { message: 'License number cannot exceed 20 characters' })
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Vehicle number cannot exceed 20 characters' })
  vehicleNumber?: string;

  @IsOptional()
  @IsEnum(['MOTORCYCLE', 'CAR', 'VAN', 'TRUCK'], {
    message: 'Vehicle type must be MOTORCYCLE, CAR, VAN, or TRUCK',
  })
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString({ message: 'Password is required' })
  password: string;
}

export class RefreshDto {
  @IsString({ message: 'Refresh token is required' })
  refreshToken: string;
}

export class DriverApplicationDto {
  @IsString()
  @MinLength(5, {
    message: 'License number must be at least 5 characters long',
  })
  @MaxLength(20, { message: 'License number cannot exceed 20 characters' })
  licenseNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(20, { message: 'Vehicle number cannot exceed 20 characters' })
  vehicleNumber?: string;

  @IsOptional()
  @IsEnum(['MOTORCYCLE', 'CAR', 'VAN', 'TRUCK'], {
    message: 'Vehicle type must be MOTORCYCLE, CAR, VAN, or TRUCK',
  })
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Reason cannot exceed 500 characters' })
  reason?: string;
}

export class DriverApplicationResponseDto {
  id: string;
  email: string;
  name: string;
  driverApplicationStatus: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
}

// Password Reset DTOs
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;
}

export class VerifyResetTokenDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Token must be exactly 6 digits' })
  token: string; // 6-digit token
}

export class ResetPasswordDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @Matches(/^[0-9]{6}$/, { message: 'Token must be exactly 6 digits' })
  token: string; // 6-digit token

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString({ message: 'Current password is required' })
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}
