import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Validate,
} from 'class-validator';

import { BloodStatus } from '../enums/blood-status.enum';

import { IsFutureDateConstraint } from './blood-units.dto';

export class UpdateBloodStatusDto {
  @IsEnum(BloodStatus)
  status: BloodStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class BulkUpdateBloodStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  @Type(() => String)
  unitIds: string[];

  @IsEnum(BloodStatus)
  status: BloodStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReserveBloodUnitDto {
  @IsString()
  @IsNotEmpty()
  reservedFor: string;

  @IsDateString()
  @Validate(IsFutureDateConstraint)
  reservedUntil: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
