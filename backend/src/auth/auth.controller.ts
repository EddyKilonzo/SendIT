import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  Req,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshDto,
  ForgotPasswordDto,
  VerifyResetTokenDto,
  ResetPasswordDto,
  ChangePasswordDto,
} from './dto';
import { createJoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  verifyResetTokenSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(createJoiValidationPipe(registerSchema))
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(loginSchema))
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshDto) {
    return await this.authService.refreshToken(refreshDto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request) {
    const userId = req.user?.['sub'];
    return await this.authService.logout(userId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-reset-token')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(verifyResetTokenSchema))
  async verifyResetToken(@Body() verifyResetTokenDto: VerifyResetTokenDto) {
    return await this.authService.verifyResetToken(
      verifyResetTokenDto.email,
      verifyResetTokenDto.token,
    );
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UsePipes(createJoiValidationPipe(changePasswordSchema))
  async changePassword(
    @Req() req: Request,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const userId = req.user?.['sub'];
    return await this.authService.changePassword(userId, changePasswordDto);
  }

  @Get('check-email')
  async checkEmail(@Query('email') email: string) {
    return this.authService.checkEmail(email);
  }

  @Get('check-anonymous-parcels')
  async checkAnonymousParcels(@Query('email') email: string) {
    return this.authService.checkAnonymousParcels(email);
  }

  // Test endpoint for debugging email sending
  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async testEmail(@Body() body: { email: string }) {
    return await this.authService.testEmail(body.email);
  }

  // Test endpoint for debugging environment variables
  @Get('test-env')
  @HttpCode(HttpStatus.OK)
  async testEnv() {
    return {
      mailHost: process.env.MAIL_HOST || 'NOT SET',
      mailPort: process.env.MAIL_PORT || 'NOT SET',
      mailSecure: process.env.MAIL_SECURE || 'NOT SET',
      mailUser: process.env.MAIL_USER ? 'SET' : 'NOT SET',
      mailPassword: process.env.MAIL_PASSWORD ? 'SET' : 'NOT SET',
      mailFrom: process.env.MAIL_FROM || 'NOT SET',
      frontendUrl: process.env.FRONTEND_URL || 'NOT SET',
    };
  }
}
