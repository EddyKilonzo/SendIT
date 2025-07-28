// Driver-specific DTOs
export interface DriverLocationUpdateDto {
  latitude: number;
  longitude: number;
  address?: string;
  heading?: number; // direction in degrees
  speed?: number; // speed in km/h
}

export interface DriverApplicationApprovalDto {
  approved: boolean;
  reason?: string;
  approvedBy: string;
}

export interface DriverResponseDto {
  id: string;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'DRIVER';
  isActive: boolean;

  // Driver-specific fields
  licenseNumber?: string;
  vehicleNumber?: string;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  currentLat?: number;
  currentLng?: number;

  // Performance metrics
  averageRating?: number;
  totalRatings: number;
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime?: number;
  onTimeDeliveryRate?: number;
  lastActiveAt?: Date;
  totalEarnings?: number;

  // Real-time data
  distance?: number; // distance from a reference point in km
  estimatedArrival?: Date;
  currentDeliveries?: number;
  capacityRemaining?: number;
  lastLocationUpdate?: Date;
  heading?: number;
  speed?: number;

  // Driver application fields
  driverApplicationStatus?: 'NOT_APPLIED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  driverApplicationDate?: Date;
  driverApprovalDate?: Date;
  driverRejectionReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface DriverPerformanceDto {
  driverId: string;
  driverName: string;

  // Delivery metrics
  totalDeliveries: number;
  completedDeliveries: number;
  cancelledDeliveries: number;
  averageDeliveryTime: number; // in minutes
  onTimeDeliveryRate: number; // percentage

  // Rating metrics
  averageRating: number;
  totalRatings: number;
  ratingTrend: Array<{
    month: string;
    averageRating: number;
  }>;

  // Financial metrics
  totalEarnings: number;
  averageEarningsPerDelivery: number;

  // Efficiency metrics
  fuelEfficiency?: number;
  routeOptimizationScore?: number;
  customerSatisfactionScore: number;

  // Activity metrics
  hoursWorked: number;
  deliveriesPerHour: number;
  lastActiveAt: Date;
}

export interface NearbyDriverDto {
  drivers: DriverResponseDto[];
  searchRadius: number;
  searchCenter: {
    latitude: number;
    longitude: number;
  };
  availableCount: number;
  averageDistance: number;
}

export interface DriverAssignmentCriteriaDto {
  parcelId: string;
  pickupLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  deliveryLocation: {
    latitude: number;
    longitude: number;
    address: string;
  };
  weight: number;

  maxDistance?: number; // in km
  requiredVehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  minimumRating?: number;
}

export interface DriverAssignmentResponseDto {
  recommendedDrivers: Array<{
    driver: DriverResponseDto;
    score: number;
    estimatedPickupTime: Date;
    estimatedDeliveryTime: Date;
    distance: number;
    reasoning: string[];
  }>;
  assignmentCriteria: DriverAssignmentCriteriaDto;
}

export interface DriversQueryDto {
  page?: number;
  limit?: number;
  vehicleType?: 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  location?: {
    latitude: number;
    longitude: number;
    radius: number; // in kilometers
  };
  minimumRating?: number;
  maxCurrentDeliveries?: number;
  onlineOnly?: boolean;
  sortBy?: 'distance' | 'rating' | 'lastActiveAt' | 'totalDeliveries';
  sortOrder?: 'asc' | 'desc';
}
