import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UssdController } from './ussd.controller';
import { UssdService } from './ussd.service';
import { UssdSession } from './entities/ussd-session.entity';
import { BloodRequestsModule } from '../blood-requests/blood-requests.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UssdSession]),
    BloodRequestsModule,
  ],
  controllers: [UssdController],
  providers: [UssdService],
  exports: [UssdService],
})
export class UssdModule {}
