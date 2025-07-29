import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SendITMailerModule } from '../mailer/mailer.module';
import { ParcelsModule } from '../parcels/parcels.module';

@Module({
  imports: [
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'sendit-super-secret-jwt-key-2024-secure-and-unique',
      signOptions: {
        issuer: 'sendit-api',
        audience: 'sendit-client',
      },
      verifyOptions: {
        issuer: 'sendit-api',
        audience: 'sendit-client',
      },
    }),
    forwardRef(() => SendITMailerModule),
    forwardRef(() => ParcelsModule),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
