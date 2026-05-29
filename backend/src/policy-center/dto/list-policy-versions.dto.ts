import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PolicyVersionStatus } from '../enums/policy-version-status.enum';

export class ListPolicyVersionsDto {
  @IsOptional()
  @IsString()
  policyName?: string;

  @IsOptional()
  @IsEnum(PolicyVersionStatus)
  status?: PolicyVersionStatus;
}
