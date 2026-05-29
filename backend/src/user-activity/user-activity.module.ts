import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserActivityEntity } from './entities/user-activity.entity';
import { UserActivityController } from './user-activity.controller';
import { UserActivityService } from './user-activity.service';
import { SecurityEventLoggerService } from './security-event-logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserActivityEntity])],
  providers: [UserActivityService, SecurityEventLoggerService],
  controllers: [UserActivityController],
  exports: [UserActivityService, SecurityEventLoggerService],
})
export class UserActivityModule {}
