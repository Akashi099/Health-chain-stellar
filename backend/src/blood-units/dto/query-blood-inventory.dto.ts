import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  Matches,
} from 'class-validator';

import { BloodComponent } from '../enums/blood-component.enum';
import { BloodStatus } from '../enums/blood-status.enum';
import { BloodType } from '../enums/blood-type.enum';

export enum InventorySortField {
  EXPIRES_AT = 'expiresAt',
  CREATED_AT = 'createdAt',
  VOLUME_ML = 'volumeMl',
  BLOOD_TYPE = 'bloodType',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class QueryBloodInventoryDto {
  @IsOptional()
  @IsEnum(BloodType)
  bloodType?: BloodType;

  @IsOptional()
  @IsEnum(BloodStatus)
  status?: BloodStatus;

  @IsOptional()
  @IsEnum(BloodComponent)
  component?: BloodComponent;

  @IsOptional()
  @IsString()
  @Matches(/^G[A-Z2-7]{55}$/)
  bankId?: string;

  @IsOptional()
  @IsISO8601()
  expiresAfter?: string;

  @IsOptional()
  @IsISO8601()
  expiresBefore?: string;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  minVolumeMl?: number;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  maxVolumeMl?: number;

  @IsOptional()
  @IsEnum(InventorySortField)
  sortBy?: InventorySortField = InventorySortField.EXPIRES_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }: { value: string }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
