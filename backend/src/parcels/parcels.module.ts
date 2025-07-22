import { Module } from '@nestjs/common';
import { ParcelsService } from './parcels.service';
import { ParcelsController } from './parcels.controller';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [ParcelsController],
  providers: [ParcelsService, PrismaService],
  exports: [ParcelsService],
})
export class ParcelsModule {}
