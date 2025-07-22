import { ApiResponseDto, PaginatedResponseDto, PaginationDto } from '../dto';

export class ApiResponse {
  static success<T>(
    data: T,
    message = 'Operation successful',
  ): ApiResponseDto<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date(),
    };
  }

  static error(
    message = 'Operation failed',
    error?: string,
  ): ApiResponseDto<null> {
    return {
      success: false,
      message,
      error,
      timestamp: new Date(),
    };
  }

  static paginated<T>(
    data: T[],
    pagination: PaginationDto,
    message = 'Data retrieved successfully',
  ): PaginatedResponseDto<T> {
    return {
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date(),
    };
  }
}
