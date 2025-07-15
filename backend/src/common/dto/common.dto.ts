// Common DTOs
export interface ApiResponseDto<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponseDto<T = any> extends ApiResponseDto<T> {
  pagination: PaginationDto;
}

export interface IdParamDto {
  id: string;
}

export interface TrackingParamDto {
  trackingNumber: string;
}

export interface UserIdParamDto {
  userId: string;
}
