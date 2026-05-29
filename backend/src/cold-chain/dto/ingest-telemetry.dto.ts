import { IsNumber, IsOptional, IsString, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class IngestTelemetryDto {
  @IsString()
  deliveryId: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsNumber()
  @Type(() => Number)
  temperatureCelsius: number;

  @IsDateString()
  @IsOptional()
  recordedAt?: string;

  @IsString()
  @IsOptional()
  @IsIn(['manual', 'iot', 'rider'])
  source?: string;
}
