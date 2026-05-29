import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class UpdatePolicyVersionDto {
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}
