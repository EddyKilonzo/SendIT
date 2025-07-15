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
  userId: string;
  action: 'activate' | 'deactivate' | 'suspend' | 'unsuspend';
  reason?: string;
}

export class DriverApplicationManagementDto {
  userId: string;
  action: 'approve' | 'reject';
  reason?: string;
}

export class ParcelManagementDto {
  parcelId: string;
  action: 'cancel' | 'reassign' | 'priority' | 'normal';
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
  priority?: 'high' | 'normal' | 'low';
}

export class UserFilterDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isActive?: boolean;
  hasParcels?: boolean;
  driverApplicationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export class DriverApplicationFilterDto {
  page?: number = 1;
  limit?: number = 10;
  search?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  dateFrom?: string;
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
