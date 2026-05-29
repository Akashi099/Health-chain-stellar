import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class RaiseDisputeDto {
  @IsString()
  @MinLength(10)
  reason: string;

  @IsOptional()
  @IsUUID()
  disputeId?: string;
}
