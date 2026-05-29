import { IsUUID, IsString, MinLength } from 'class-validator';

export class RevokeVerificationDto {
  @IsUUID()
  organizationId!: string;

  @IsString()
  @MinLength(10)
  reason!: string;
}
