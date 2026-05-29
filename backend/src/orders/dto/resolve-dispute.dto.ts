import { IsEnum } from 'class-validator';

export enum DisputeResolution {
  DELIVERED = 'DELIVERED',
  REFUND = 'REFUND',
}

export class ResolveDisputeDto {
  @IsEnum(DisputeResolution)
  resolution: DisputeResolution;
}
