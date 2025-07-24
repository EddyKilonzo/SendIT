import { Module } from '@nestjs/common';
import { RolesGuard } from './guards/roles.guard';
import { CloudinaryService } from './cloudinary/cloudinary.service';

@Module({
  providers: [RolesGuard, CloudinaryService],
  exports: [RolesGuard, CloudinaryService],
})
export class CommonModule {}
