import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { ReviewModerationAction } from '../enums/review-moderation-action.enum';

export class ModerateOrganizationReviewDto {
  @IsEnum(ReviewModerationAction)
  action: ReviewModerationAction;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason?: string;
}
