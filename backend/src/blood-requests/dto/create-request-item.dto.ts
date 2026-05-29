import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { BloodComponent } from '../../blood-units/enums/blood-component.enum';
import { BloodType } from '../../blood-units/enums/blood-type.enum';
import { ItemPriority } from '../entities/blood-request-item.entity';

export class CreateRequestItemDto {
  @IsEnum(BloodType)
  bloodType: BloodType;

  @IsEnum(BloodComponent)
  component: BloodComponent;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  quantityMl: number;

  @IsEnum(ItemPriority)
  @IsOptional()
  priority?: ItemPriority;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  compatibilityNotes?: string;

  // Backward compatibility: old property names
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @IsOptional()
  bloodBankId?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  quantity?: number;

  /**
   * Get the quantity, preferring quantityMl over quantity
   */
  getQuantity(): number {
    return this.quantityMl ?? this.quantity ?? 0;
  }
}
