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
import { ParcelsService } from '../parcels/parcels.service';

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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly parcelsService: ParcelsService,
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

      // Link any anonymous parcels to the new user
      let linkedParcelsMessage = '';
      try {
        const linkResult = await this.parcelsService.linkAnonymousParcelsToUser(
          user.id,
          user.email,
        );
        if (linkResult.linkedParcels > 0) {
          linkedParcelsMessage = ` ${linkResult.message}`;
          this.logger.log(
            `Linked ${linkResult.linkedParcels} anonymous parcels to new user ${user.email}`,
          );
        }
      } catch (linkError) {
        this.logger.warn(
          `Failed to link anonymous parcels for user ${user.email}:`,
          linkError,
        );
        // Don't fail registration if linking fails
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Send welcome email
      try {
        this.logger.log(
          `Debug - User data for email: name="${user.name}", profilePicture="${user.profilePicture}"`,
        );
        await this.mailerService.sendWelcomeEmail({
          to: user.email,
          name: user.name,
          profilePicture: user.profilePicture || undefined,
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
        `User registered successfully. Welcome email sent.${linkedParcelsMessage}`,
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

  // Password Reset Methods
  async forgotPassword(email: string): Promise<ApiResponseDto<boolean>> {
    try {
      this.logger.log(`Password reset requested for email: ${email}`);

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        this.logger.log(
          `Password reset requested for non-existent email: ${email}`,
        );
        return ApiResponse.success(
          true,
          'If the email exists, a reset code has been sent',
        );
      }

      this.logger.log(
        `Debug - User data for password reset: name="${user.name}", profilePicture="${user.profilePicture}"`,
      );

      // Clean up expired tokens for this email
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          email,
          OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
        },
      });

      // Check if there's already an active token (not expired and not used)
      const existingToken = await this.prisma.passwordResetToken.findFirst({
        where: {
          email,
          used: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (existingToken) {
        this.logger.log(
          `Active password reset token already exists for: ${email}, reusing existing token`,
        );
        // Reuse existing token if it's still valid
        await this.mailerService.sendPasswordResetEmail({
          to: email,
          name: user.name,
          profilePicture: user.profilePicture || undefined,
          resetToken: existingToken.token,
        });

        this.logger.log(
          `Password reset email sent with existing token to: ${email}`,
        );
        return ApiResponse.success(
          true,
          'If the email exists, a reset code has been sent',
        );
      }

      // Generate 6-digit token
      const resetToken = this.generateSixDigitToken();
      this.logger.log(`Generated new password reset token for: ${email}`);

      // Store token in database with expiration (15 minutes)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await this.prisma.passwordResetToken.create({
        data: {
          email,
          token: resetToken,
          expiresAt,
          used: false,
        },
      });

      this.logger.log(
        `Password reset token stored in database for: ${email}, expires at: ${expiresAt.toISOString()}`,
      );

      // Send email with token
      await this.mailerService.sendPasswordResetEmail({
        to: email,
        name: user.name,
        profilePicture: user.profilePicture || undefined,
        resetToken: resetToken,
      });

      this.logger.log(
        `✅ Password reset process completed successfully for: ${email}`,
      );
      return ApiResponse.success(
        true,
        'If the email exists, a reset code has been sent',
      );
    } catch (error) {
      this.logger.error(
        `❌ Error in forgotPassword for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async verifyResetToken(
    email: string,
    token: string,
  ): Promise<ApiResponseDto<boolean>> {
    try {
      this.logger.log(`Verifying reset token for email: ${email}`);

      // Find the token in database
      const resetToken = await this.prisma.passwordResetToken.findFirst({
        where: {
          email,
          token,
          used: false,
          expiresAt: {
            gt: new Date(), // Token not expired
          },
        },
      });

      if (!resetToken) {
        this.logger.log(
          `❌ Invalid or expired reset token for email: ${email}`,
        );
        return ApiResponse.success(false, 'Invalid or expired reset token');
      }

      this.logger.log(
        `✅ Reset token verified successfully for email: ${email}, expires at: ${resetToken.expiresAt.toISOString()}`,
      );
      return ApiResponse.success(true, 'Token is valid');
    } catch (error) {
      this.logger.error(
        `❌ Error in verifyResetToken for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Promise<ApiResponseDto<boolean>> {
    try {
      this.logger.log(`Password reset attempt for email: ${email}`);

      // Verify token first
      const resetToken = await this.prisma.passwordResetToken.findFirst({
        where: {
          email,
          token,
          used: false,
          expiresAt: {
            gt: new Date(), // Token not expired
          },
        },
      });

      if (!resetToken) {
        this.logger.log(
          `❌ Invalid or expired reset token for password reset: ${email}`,
        );
        throw new InvalidCredentialsException('Invalid or expired reset token');
      }

      this.logger.log(`✅ Reset token validated for password reset: ${email}`);

      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.log(`❌ User not found for password reset: ${email}`);
        throw new InvalidCredentialsException('User not found');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
      this.logger.log(`Password hashed successfully for: ${email}`);

      // Update user password
      await this.prisma.user.update({
        where: { email },
        data: { password: hashedPassword },
      });

      this.logger.log(`User password updated successfully for: ${email}`);

      // Mark token as used
      await this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      this.logger.log(`Reset token marked as used for: ${email}`);

      // Clean up all expired tokens for this email
      await this.prisma.passwordResetToken.deleteMany({
        where: {
          email,
          OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
        },
      });

      this.logger.log(`Cleaned up expired/used tokens for: ${email}`);

      this.logger.log(`✅ Password reset completed successfully for: ${email}`);
      return ApiResponse.success(true, 'Password reset successfully');
    } catch (error) {
      this.logger.error(
        `❌ Error in resetPassword for ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  private generateSixDigitToken(): string {
    const token = Math.floor(100000 + Math.random() * 900000).toString();
    this.logger.log(`Generated 6-digit token: ${token}`);
    return token;
  }

  // Clean up expired password reset tokens
  async cleanupExpiredTokens(): Promise<void> {
    try {
      const result = await this.prisma.passwordResetToken.deleteMany({
        where: {
          OR: [{ expiresAt: { lt: new Date() } }, { used: true }],
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `🧹 Cleaned up ${result.count} expired/used password reset tokens`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Error cleaning up expired tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Test email method for debugging
  async testEmail(email: string): Promise<ApiResponseDto<boolean>> {
    try {
      await this.mailerService.sendTestEmail(email);
      return ApiResponse.success(true, 'Test email sent successfully');
    } catch (error) {
      this.logger.error('Failed to send test email:', error);
      return ApiResponse.success(false, 'Failed to send test email');
    }
  }

  // Check if email is available for registration
  async checkEmail(
    email: string,
  ): Promise<ApiResponseDto<{ available: boolean; message: string }>> {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return ApiResponse.success(
          { available: false, message: 'Email is already registered' },
          'Email is not available',
        );
      }

      return ApiResponse.success(
        { available: true, message: 'Email is available for registration' },
        'Email is available',
      );
    } catch (error) {
      this.logger.error('Error checking email availability:', error);
      return ApiResponse.success(
        { available: false, message: 'Failed to check email availability' },
        'Failed to check email availability',
      );
    }
  }

  // Check for anonymous parcels by email
  async checkAnonymousParcels(
    email: string,
  ): Promise<ApiResponseDto<{ count: number; parcels: any[] }>> {
    try {
      const parcels =
        await this.parcelsService.getAnonymousParcelsByEmail(email);

      return ApiResponse.success(
        {
          count: parcels.length,
          parcels: parcels.slice(0, 5), // Return first 5 parcels for preview
        },
        `Found ${parcels.length} anonymous parcel(s) for this email`,
      );
    } catch (error) {
      this.logger.error('Error checking anonymous parcels:', error);
      return ApiResponse.success(
        { count: 0, parcels: [] },
        'Failed to check anonymous parcels',
      );
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
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
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
