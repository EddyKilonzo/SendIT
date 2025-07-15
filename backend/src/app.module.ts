import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ParcelsModule } from './parcels/parcels.module';
import { AdminModule } from './admin/admin.module';
import { DriversModule } from './drivers/drivers.module';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    ParcelsModule,
    AdminModule,
    DriversModule,
    CommonModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
