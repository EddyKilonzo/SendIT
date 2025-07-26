import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum, IsNotEmpty, IsIn, MaxLength } from 'class-validator';

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
  parcelId: string;
  driverId: string;
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
  userId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export class ParcelManagementDto {
  parcelId: string;
  action: 'cancel' | 'reassign';
  reason?: string;
  newDriverId?: string;
}

export class DriverFilterDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  isActive?: boolean;
  isAvailable?: boolean;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
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
