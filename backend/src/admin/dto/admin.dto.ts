import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsIn,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class DashboardStatsDto {
  totalUsers: number;
  totalDrivers: number;
  totalParcels: number;
  pendingParcels: number;
  inTransitParcels: number;
  deliveredParcels: number;
  cancelledParcels: number;
  availableDrivers: number;
  activeDrivers: number;
  pendingDriverApplications: number;
}

export class SystemStatsDto {
  totalRevenue: number;
  monthlyRevenue: number;
  averageDeliveryTime: number;
  customerSatisfaction: number;
  topPerformingDrivers: Array<{
    driverId: string;
    driverName: string;
    deliveriesCompleted: number;
    averageRating: number;
  }>;
  popularRoutes: Array<{
    fromLocation: string;
    toLocation: string;
    parcelCount: number;
  }>;
}

export class AssignParcelToDriverDto {
  @IsString()
  @IsNotEmpty()
  parcelId: string;

  @IsString()
  @IsNotEmpty()
  driverId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  assignmentNotes?: string;
}

export class BulkAssignParcelsDto {
  assignments: Array<{
    parcelId: string;
    driverId: string;
    assignmentNotes?: string;
  }>;
}

export class DriverManagementDto {
  driverId: string;
  action: 'activate' | 'deactivate' | 'suspend' | 'unsuspend';
  reason?: string;
}

export class UserManagementDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsIn(['activate', 'deactivate', 'suspend', 'unsuspend'])
  action: 'activate' | 'deactivate' | 'suspend' | 'unsuspend';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class DriverApplicationManagementDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsString()
  @IsIn(['approve', 'reject'])
  action: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ValidateIf((o) => o.action === 'reject')
  @IsNotEmpty({ message: 'Rejection reason is required when action is reject' })
  reason?: string; // Required when action is 'reject'
}

export class ParcelManagementDto {
  parcelId: string;
  action: 'cancel' | 'reassign';
  reason?: string;
  newDriverId?: string;
}

export class DriverFilterDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  isAvailable?: boolean;

  @IsOptional()
  @IsEnum(['MOTORCYCLE', 'CAR', 'VAN', 'TRUCK'])
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  hasAssignedParcels?: boolean;
}

export class ParcelFilterDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  status?:
    | 'pending'
    | 'assigned'
    | 'picked_up'
    | 'in_transit'
    | 'delivered'
    | 'cancelled';
  assignedDriverId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class UserFilterDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['CUSTOMER', 'DRIVER', 'ADMIN'])
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  hasParcels?: boolean;

  @IsOptional()
  @IsEnum(['NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED'])
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    return value === 'true' || value === true;
  })
  @IsBoolean()
  showSuspended?: boolean;
}

export class DriverApplicationFilterDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['NOT_APPLIED', 'PENDING', 'APPROVED', 'REJECTED'])
  status?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class NotificationSettingsDto {
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: {
    newParcel: boolean;
    parcelAssigned: boolean;
    statusUpdate: boolean;
    deliveryComplete: boolean;
    systemAlerts: boolean;
    driverApplication: boolean;
  };
}

export class SystemSettingsDto {
  maxParcelsPerDriver: number;
  deliveryTimeLimit: number; // in hours
  autoAssignmentEnabled: boolean;
  notificationEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
  autoApproveDrivers: boolean;
  requireDriverBackgroundCheck: boolean;
}
