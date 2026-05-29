import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsDateString,
  IsBoolean,
} from 'class-validator';

export class DeliveryProofQueryDto {
  @IsOptional()
  @IsString()
  riderId?: string;

  @IsOptional()
  @IsString()
  requestId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  temperatureCompliantOnly?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([10, 25, 50, 100])
  pageSize?: number = 25;
}
