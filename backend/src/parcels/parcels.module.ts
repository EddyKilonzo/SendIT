import { Module } from '@nestjs/common';
import { ParcelsController } from './parcels.controller';
import { ParcelsService } from './parcels.service';

@Module({
  controllers: [ParcelsController],
  providers: [ParcelsService],
})
export class ParcelsModule {}
