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
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.usersService.findOne(params.id);
  }

  @Get('profile/me')
  getProfile() {
    // This would typically get the user ID from the JWT token
    // For now, returning a placeholder
    return { message: 'Get current user profile endpoint' };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @UsePipes(createJoiValidationPipe(updateUserSchema))
  update(@Param() params: IdParamDto, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(params.id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: IdParamDto) {
    return this.usersService.remove(params.id);
  }

  @Patch(':id/change-password')
  @HttpCode(HttpStatus.OK)
  changePassword(
    @Param() params: IdParamDto,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(params.id, changePasswordDto);
  }
}
