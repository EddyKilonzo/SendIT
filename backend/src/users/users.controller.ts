import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UsePipes,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  UsersQueryDto,
} from './dto';
import { IdParamDto } from '../common/dto';
import { createJoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { registerSchema, updateUserSchema } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(createJoiValidationPipe(registerSchema))
  @Roles('ADMIN')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Roles('ADMIN')
  findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get('profile/me')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getProfile(@Request() req: { user: { sub: string } }) {
    const user = await this.usersService.getProfile(req.user.sub);
    return {
      success: true,
      data: user,
      message: 'Profile retrieved successfully',
    };
  }

  @Get('dashboard')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getDashboard(@Request() req: { user: { sub: string } }) {
    const dashboardData = await this.usersService.getDashboard(req.user.sub);
    return {
      success: true,
      data: dashboardData,
      message: 'Dashboard data retrieved successfully',
    };
  }

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post('profile/upload-picture')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('profilePicture'))
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async uploadProfilePicture(
    @Request() req: { user: { sub: string } },
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }
    const result = await this.usersService.uploadProfilePicture(
      req.user.sub,
      file,
    );
    return {
      success: true,
      data: {
        profilePicture: result.profilePicture,
      },
      message: result.message,
    };
  }

  @Patch('profile/deactivate')
  @HttpCode(HttpStatus.OK)
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  deactivateAccount(@Request() req: { user: { sub: string } }) {
    return this.usersService.deactivateAccount(req.user.sub);
  }

  @Delete('profile/delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  deleteAccount(@Request() req: { user: { sub: string } }) {
    return this.usersService.deleteAccount(req.user.sub);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  update(
    @Param('id') id: string,
    @Body(createJoiValidationPipe(updateUserSchema))
    updateUserDto: UpdateUserDto,
    @Request() req: any,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(id, changePasswordDto);
  }
}
