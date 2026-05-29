import { IsUUID, IsOptional, IsString } from 'class-validator';

export class VerifyOrganizationDto {
  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
