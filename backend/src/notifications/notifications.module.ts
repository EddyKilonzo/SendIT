import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DatabaseModule } from '../database/database.module';
import { CommonModule } from '../common/common.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JWT_CONFIG } from '../common/constants';

@Module({
  imports: [
    DatabaseModule,
    CommonModule,
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { ...JWT_CONFIG.signOptions, expiresIn: '24h' },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, JwtAuthGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
