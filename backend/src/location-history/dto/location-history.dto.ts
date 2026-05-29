import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaveLocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  /** GPS accuracy in metres. */
  @IsNumber()
  @IsOptional()
  @Min(0)
  accuracy?: number;

  /** Speed in m/s from the device GPS. */
  @IsNumber()
  @IsOptional()
  @Min(0)
  speed?: number;

  /** Compass heading in degrees 0–360. */
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(360)
  heading?: number;

  /** Altitude in metres above sea level. */
  @IsNumber()
  @IsOptional()
  altitude?: number;

  /** Associate with a specific delivery/order. */
  @IsUUID('4')
  @IsOptional()
  orderId?: string;

  /** Client-side ISO timestamp; defaults to server receive time if omitted. */
  @IsDateString()
  @IsOptional()
  recordedAt?: string;
}

export class BatchSaveLocationsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => SaveLocationDto)
  locations: SaveLocationDto[];
}

export class LocationQueryDto {
  /** Filter points from this ISO timestamp onwards. */
  @IsDateString()
  @IsOptional()
  from?: string;

  /** Filter points up to this ISO timestamp. */
  @IsDateString()
  @IsOptional()
  to?: string;

  /** Maximum number of raw points to return (default 1000, max 5000). */
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(5000)
  @Type(() => Number)
  limit?: number;
}

export class RouteQueryDto extends LocationQueryDto {
  /**
   * Douglas-Peucker epsilon in degrees.
   * ~0.00001° ≈ 1 m, ~0.0001° ≈ 11 m (default), ~0.001° ≈ 111 m.
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  epsilon?: number;
}
