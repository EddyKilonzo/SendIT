import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReviewsQueryDto } from './dto';
// TODO: Import guards and decorators when they are created
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../common/guards/roles.guard';
// import { Roles } from '../common/decorators/roles.decorator';

@Controller('reviews')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  // @Roles('CUSTOMER')
  async create(@Body() createReviewDto: CreateReviewDto, @Request() req: any) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get()
  async findAll(@Query() query: ReviewsQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Get('summary/:userId')
  async getReviewSummary(@Param('userId') userId: string) {
    return this.reviewsService.getReviewSummary(userId);
  }

  @Get('parcel/:parcelId')
  async getParcelReviews(@Param('parcelId') parcelId: string) {
    return this.reviewsService.getParcelReviews(parcelId);
  }

  @Get('my-reviews')
  // @Roles('CUSTOMER')
  async getMyReviews(@Request() req: any) {
    return this.reviewsService.getUserReviews(req.user.id);
  }

  @Get('received')
  // @Roles('DRIVER')
  async getReviewsReceived(@Request() req: any) {
    return this.reviewsService.getReviewsReceived(req.user.id);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Patch(':id')
  // @Roles('CUSTOMER')
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req: any,
  ) {
    return this.reviewsService.update(id, updateReviewDto, req.user.id);
  }

  @Delete(':id')
  // @Roles('CUSTOMER')
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.reviewsService.remove(id, req.user.id);
  }
}
