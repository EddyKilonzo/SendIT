import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReviewsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';

// Request interface for type safety
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string;
    email: string;
  };
}

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles('CUSTOMER')
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.create(createReviewDto, req.user.id);
  }

  @Get()
  @Roles('ADMIN')
  async findAll(
    @Query() query: ReviewsQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.findAll(query, req.user.role, req.user.id);
  }

  @Get('driver-summary/:driverId')
  @Roles('DRIVER', 'ADMIN')
  async getDriverReviewSummary(@Param('driverId') driverId: string) {
    return this.reviewsService.getDriverReviewSummary(driverId);
  }

  @Get('parcel/:parcelId')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getParcelReviews(@Param('parcelId') parcelId: string) {
    return this.reviewsService.getParcelReviews(parcelId);
  }

  @Get('my-reviews')
  @Roles('CUSTOMER')
  async getMyReviews(@Request() req: AuthenticatedRequest) {
    return this.reviewsService.getUserReviews(req.user.id);
  }

  @Get(':id')
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.reviewsService.findOne(id, req.user.role, req.user.id);
  }

  @Patch(':id')
  @Roles('CUSTOMER')
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.update(id, updateReviewDto, req.user.id);
  }

  @Delete(':id')
  @Roles('CUSTOMER')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.reviewsService.remove(id, req.user.id);
  }
}
