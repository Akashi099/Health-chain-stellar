import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LocationHistoryEntity } from './entities/location-history.entity';
import { LocationHistoryController } from './location-history.controller';
import { LocationHistoryService } from './location-history.service';

@Module({
  imports: [TypeOrmModule.forFeature([LocationHistoryEntity])],
  controllers: [LocationHistoryController],
  providers: [LocationHistoryService],
  exports: [LocationHistoryService],
})
export class LocationHistoryModule {}
