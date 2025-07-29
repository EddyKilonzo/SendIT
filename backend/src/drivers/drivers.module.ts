import { Module } from '@nestjs/common';
import { DriversController } from './drivers.controller';
import { DriversService } from './drivers.service';
import { DriversGateway } from './drivers.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { SendITMailerModule } from '../mailer/mailer.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'sendit-super-secret-jwt-key-2024-secure-and-unique',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
    MailerModule,
    SendITMailerModule,
  ],
  controllers: [DriversController],
  providers: [DriversService, DriversGateway],
  exports: [DriversService, DriversGateway],
})
export class DriversModule {}
