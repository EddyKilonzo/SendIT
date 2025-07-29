import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { CommonModule } from '../common/common.module';
import { SendITMailerModule } from '../mailer/mailer.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JWT_CONFIG } from '../common/constants';

@Module({
  imports: [
    JwtModule.register({
      secret: JWT_CONFIG.secret,
      signOptions: { ...JWT_CONFIG.signOptions, expiresIn: '24h' },
    }),
    CommonModule,
    SendITMailerModule,
    NotificationsModule,
  ],
  controllers: [ParcelsController],
  providers: [ParcelsService, JwtAuthGuard],
  exports: [ParcelsService],
})
export class ParcelsModule {}
