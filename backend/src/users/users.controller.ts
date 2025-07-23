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
} from '@nestjs/common';

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

  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param() params: IdParamDto) {
    return this.usersService.findOne(params.id);
  }

  @Get('profile/me')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  getProfile(@Request() req: { user: { id: string } }) {
    return this.usersService.findOne(req.user.id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateUserSchema))
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  update(@Param() params: IdParamDto, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(params.id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('ADMIN')
  remove(@Param() params: IdParamDto) {
    return this.usersService.remove(params.id);
  }

  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  changePassword(
    @Param() params: IdParamDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(params.id, changePasswordDto);
  }
}
