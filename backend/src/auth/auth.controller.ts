import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshDto } from './dto';
import { createJoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { registerSchema, loginSchema } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(createJoiValidationPipe(registerSchema))
  register(@Body() registerDto: RegisterDto) {
    return { message: 'User registration endpoint', data: registerDto };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(loginSchema))
  login(@Body() loginDto: LoginDto) {
    return { message: 'User login endpoint', data: loginDto };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() refreshDto: RefreshDto) {
    return { message: 'Token refresh endpoint', data: refreshDto };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    return { message: 'User logout endpoint' };
  }
}
