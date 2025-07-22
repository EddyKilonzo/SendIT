// Enhanced Common DTOs
export interface ApiResponseDto<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface ApiErrorDto {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  context?: string;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponseDto<T = unknown> extends ApiResponseDto<T[]> {
  pagination: PaginationDto;
}

export interface QueryOptionsDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  include?: string[];
  fields?: string[];
}

export interface DateRangeDto {
  from?: Date;
  to?: Date;
}

export interface LocationDto {
  latitude: number;
  longitude: number;
  radius?: number; // in kilometers
}

// Parameter DTOs
export interface IdParamDto {
  id: string;
}

export interface TrackingParamDto {
  trackingNumber: string;
}

export interface UserIdParamDto {
  userId: string;
}

// Auth DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResponseDto {
  user: any; // Will be replaced with UserResponseDto
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
