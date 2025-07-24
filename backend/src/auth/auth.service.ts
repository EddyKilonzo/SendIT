import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import {
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  ApiResponseDto,
} from '../common/dto/common.dto';
import {
  CreateUserDto,
  ChangePasswordDto,
  UserResponseDto,
} from '../users/dto/user.dto';
import { ApiResponse } from '../common/api-response/api-response.util';
import {
  InvalidCredentialsException,
  UserAlreadyExistsException,
  UserNotFoundException,
  TokenExpiredException,
  UserInactiveException,
} from '../common/exceptions/custom.exceptions';
import * as bcrypt from 'bcrypt';
import { UserRole, User } from '@prisma/client';
import { MailerService } from '../mailer/mailer.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRES_IN = '1h';
  private readonly REFRESH_TOKEN_EXPIRES_IN = '7d';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async register(
    createUserDto: CreateUserDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email: createUserDto.email },
      });

      if (existingUser) {
        throw new UserAlreadyExistsException(createUserDto.email);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(
        createUserDto.password,
        this.SALT_ROUNDS,
      );

      // Create user with specified role or default to CUSTOMER
      const userData = {
        email: createUserDto.email,
        password: hashedPassword,
        name: createUserDto.name,
        phone: createUserDto.phone,
        address: createUserDto.address,
        role: createUserDto.role || UserRole.CUSTOMER, // Allow role specification
        // Set default values for metrics
        averageRating: 0,
        totalRatings: 0,
        totalDeliveries: 0,
        completedDeliveries: 0,
        cancelledDeliveries: 0,
        onTimeDeliveryRate: 0,
        totalEarnings: 0,
        totalParcelsEverSent: 0,
        totalParcelsReceived: 0,
      };

      const user = await this.prisma.user.create({
        data: userData,
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Send welcome email
      try {
        await this.mailerService.sendWelcomeEmail({
          to: user.email,
          name: user.name,
        });
        this.logger.log(`Welcome email sent to: ${user.email}`);
      } catch (emailError) {
        this.logger.warn(
          `Failed to send welcome email to ${user.email}:`,
          emailError,
        );
        // Don't fail registration if email fails
      }

      // Prepare response
      const userResponse: UserResponseDto = this.mapToUserResponse(user);
      const authResponse: AuthResponseDto = {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 3600, // 1 hour in seconds
      };

      this.logger.log(`User registered successfully: ${user.email}`);
      return ApiResponse.success(
        authResponse,
        'User registered successfully. Welcome email sent.',
      );
    } catch (error) {
      this.logger.error('Registration failed', error);

      if (error instanceof UserAlreadyExistsException) {
        throw error;
      }

      if (error instanceof Error) {
        throw new Error(error.message);
      }

      throw new Error('Registration failed');
    }
  }

  async login(loginDto: LoginDto): Promise<ApiResponseDto<AuthResponseDto>> {
    try {
      // Find user
      const user = await this.prisma.user.findUnique({
        where: { email: loginDto.email },
      });

      if (!user) {
        throw new InvalidCredentialsException();
      }

      // Check if user is active
      if (!user.isActive) {
        throw new UserInactiveException();
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(
        loginDto.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw new InvalidCredentialsException();
      }

      // Update last active timestamp for drivers
      if (user.role === UserRole.DRIVER) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastActiveAt: new Date() },
        });
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Prepare response
      const userResponse: UserResponseDto = this.mapToUserResponse(user);
      const authResponse: AuthResponseDto = {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 3600,
      };

      this.logger.log(`User logged in successfully: ${user.email}`);
      return ApiResponse.success(authResponse, 'Login successful');
    } catch (error) {
      this.logger.error('Login failed', error);

      if (
        error instanceof InvalidCredentialsException ||
        error instanceof UserInactiveException
      ) {
        throw error;
      }

      throw new Error('Login failed');
    }
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<ApiResponseDto<AuthResponseDto>> {
    try {
      // Verify refresh token
      let payload: JwtPayload;
      try {
        payload = this.jwtService.verify<JwtPayload>(
          refreshTokenDto.refreshToken,
        );
      } catch {
        throw new TokenExpiredException();
      }

      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UserNotFoundException(payload.sub);
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Prepare response
      const userResponse: UserResponseDto = this.mapToUserResponse(user);
      const authResponse: AuthResponseDto = {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 3600,
      };

      return ApiResponse.success(authResponse, 'Token refreshed successfully');
    } catch (error) {
      this.logger.error('Token refresh failed', error);

      if (
        error instanceof TokenExpiredException ||
        error instanceof UserNotFoundException
      ) {
        throw error;
      }

      throw new Error('Token refresh failed');
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseDto<boolean>> {
    try {
      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new UserNotFoundException(userId);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(
        changePasswordDto.currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new InvalidCredentialsException('Current password is incorrect');
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(
        changePasswordDto.newPassword,
        this.SALT_ROUNDS,
      );

      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      this.logger.log(`Password changed for user: ${userId}`);
      return ApiResponse.success(true, 'Password changed successfully');
    } catch (error) {
      this.logger.error('Password change failed', error);

      if (
        error instanceof UserNotFoundException ||
        error instanceof InvalidCredentialsException
      ) {
        throw error;
      }

      throw new Error('Password change failed');
    }
  }

  async validateToken(token: string): Promise<ApiResponseDto<UserResponseDto>> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UserNotFoundException(payload.sub);
      }

      const userResponse: UserResponseDto = this.mapToUserResponse(user);
      return ApiResponse.success(userResponse, 'Token is valid');
    } catch (error) {
      this.logger.error('Token validation failed', error);
      throw new Error('Invalid token');
    }
  }

  async logout(userId: string): Promise<ApiResponseDto<boolean>> {
    try {
      // For drivers, you might want to set them as unavailable
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.role === UserRole.DRIVER) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            isAvailable: false,
            lastActiveAt: new Date(),
          },
        });
      }

      this.logger.log(`User logged out: ${userId}`);
      return ApiResponse.success(true, 'Logout successful');
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw new Error('Logout failed');
    }
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: UserRole;
  }): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.ACCESS_TOKEN_EXPIRES_IN,
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private mapToUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone || undefined,
      address: user.address || undefined,
      profilePicture: user.profilePicture || undefined,
      role: user.role,
      isActive: user.isActive,
      licenseNumber: user.licenseNumber || undefined,
      vehicleNumber: user.vehicleNumber || undefined,
      vehicleType: user.vehicleType || undefined,
      isAvailable: user.isAvailable,
      currentLat: user.currentLat || undefined,
      currentLng: user.currentLng || undefined,
      averageRating: user.averageRating || undefined,
      totalRatings: user.totalRatings,
      totalDeliveries: user.totalDeliveries,
      completedDeliveries: user.completedDeliveries,
      cancelledDeliveries: user.cancelledDeliveries,
      averageDeliveryTime: user.averageDeliveryTime || undefined,
      onTimeDeliveryRate: user.onTimeDeliveryRate || undefined,
      lastActiveAt: user.lastActiveAt || undefined,
      totalEarnings: user.totalEarnings || undefined,
      totalParcelsEverSent: user.totalParcelsEverSent,
      totalParcelsReceived: user.totalParcelsReceived,
      preferredPaymentMethod: user.preferredPaymentMethod || undefined,
      driverApplicationStatus: user.driverApplicationStatus || undefined,
      driverApplicationDate: user.driverApplicationDate || undefined,
      driverApprovalDate: user.driverApprovalDate || undefined,
      driverRejectionReason: user.driverRejectionReason || undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
