import { IsDateString, IsObject, IsOptional, IsString } from 'class-validator';

export class CreatePolicyVersionDto {
  @IsOptional()
  @IsString()
  policyName?: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  changeSummary?: string;

  @IsObject()
  rules: Record<string, unknown>;
}
