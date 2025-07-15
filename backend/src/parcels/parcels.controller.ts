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
} from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import {
  CreateParcelDto,
  UpdateParcelDto,
  UpdateParcelStatusDto,
  UpdateParcelLocationDto,
  ParcelsQueryDto,
} from './dto';
import { IdParamDto, TrackingParamDto, UserIdParamDto } from '../common/dto';

@Controller('parcels')
export class ParcelsController {
  constructor(private readonly parcelsService: ParcelsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createParcelDto: CreateParcelDto) {
    return { message: 'Create parcel endpoint', data: createParcelDto };
  }

  @Get()
  findAll(@Query() query: ParcelsQueryDto) {
    return { message: 'Get all parcels endpoint', query };
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return { message: `Get parcel with id ${params.id} endpoint` };
  }

  @Get('user/:userId')
  findByUser(@Param() params: UserIdParamDto) {
    return { message: `Get parcels for user ${params.userId} endpoint` };
  }

  @Get('tracking/:trackingNumber')
  findByTrackingNumber(@Param() params: TrackingParamDto) {
    return {
      message: `Get parcel with tracking number ${params.trackingNumber} endpoint`,
    };
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param() params: IdParamDto,
    @Body() updateParcelDto: UpdateParcelDto,
  ) {
    return {
      message: `Update parcel with id ${params.id} endpoint`,
      data: updateParcelDto,
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  updateStatus(
    @Param() params: IdParamDto,
    @Body() statusDto: UpdateParcelStatusDto,
  ) {
    return {
      message: `Update status for parcel with id ${params.id} endpoint`,
      data: statusDto,
    };
  }

  @Patch(':id/location')
  @HttpCode(HttpStatus.OK)
  updateLocation(
    @Param() params: IdParamDto,
    @Body() locationDto: UpdateParcelLocationDto,
  ) {
    return {
      message: `Update location for parcel with id ${params.id} endpoint`,
      data: locationDto,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: IdParamDto) {
    return { message: `Delete parcel with id ${params.id} endpoint` };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(@Param() params: IdParamDto) {
    return { message: `Cancel parcel with id ${params.id} endpoint` };
  }
}
