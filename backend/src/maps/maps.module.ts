import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { RedisModule } from '../redis/redis.module';

import { LiveOpsGateway } from './gateways/live-ops.gateway';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

@Module({
  imports: [ConfigModule, RedisModule],
  controllers: [MapsController],
  providers: [MapsService, LiveOpsGateway],
  exports: [MapsService, LiveOpsGateway],
})
export class MapsModule {}
