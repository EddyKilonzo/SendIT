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

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(createJoiValidationPipe(registerSchema))
  create(@Body() createUserDto: CreateUserDto) {
    return { message: 'Create user endpoint', data: createUserDto };
  }

  @Get()
  findAll(@Query() query: UsersQueryDto) {
    return { message: 'Get all users endpoint', query };
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return { message: `Get user with id ${params.id} endpoint` };
  }

  @Get('profile/me')
  getProfile() {
    return { message: 'Get current user profile endpoint' };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateUserSchema))
  update(@Param() params: IdParamDto, @Body() updateUserDto: UpdateUserDto) {
    return {
      message: `Update user with id ${params.id} endpoint`,
      data: updateUserDto,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: IdParamDto) {
    return { message: `Delete user with id ${params.id} endpoint` };
  }

  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Param() params: IdParamDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return {
      message: `Change password for user with id ${params.id} endpoint`,
      data: changePasswordDto,
    };
  }
}
