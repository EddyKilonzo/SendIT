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
  UsePipes,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto, ReviewsQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators';
import { createJoiValidationPipe } from '../common/pipes/joi-validation.pipe';
import { createReviewSchema, updateReviewSchema, reviewsQuerySchema } from './dto/review.schemas';

// Request interface for type safety
interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    role: string;
    email: string;
  };
}

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @UsePipes(createJoiValidationPipe(createReviewSchema))
  async create(
    @Body() createReviewDto: CreateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.create(createReviewDto, req.user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UsePipes(createJoiValidationPipe(reviewsQuerySchema))
  async findAll(
    @Query() query: ReviewsQueryDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.findAll(query, req.user.role, req.user.sub);
  }

  @Get('driver-summary/:driverId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER', 'ADMIN')
  async getDriverReviewSummary(@Param('driverId') driverId: string) {
    return this.reviewsService.getDriverReviewSummary(driverId);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getReviewStats() {
    return this.reviewsService.getReviewStats();
  }

  @Post('recalculate-driver-ratings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async recalculateAllDriverRatings() {
    return this.reviewsService.recalculateAllDriverRatings();
  }

  @Get('parcel/:parcelId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async getParcelReviews(@Param('parcelId') parcelId: string) {
    return this.reviewsService.getParcelReviews(parcelId);
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  async getMyReviews(@Request() req: AuthenticatedRequest) {
    return this.reviewsService.getUserReviews(req.user.sub);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER', 'DRIVER', 'ADMIN')
  async findOne(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.reviewsService.findOne(id, req.user.role, req.user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  @UsePipes(createJoiValidationPipe(updateReviewSchema))
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.reviewsService.update(id, updateReviewDto, req.user.sub);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CUSTOMER')
  async remove(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
    return this.reviewsService.remove(id, req.user.sub);
  }
}
