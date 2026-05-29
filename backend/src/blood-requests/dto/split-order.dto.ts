import { IsArray, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AllocationSourceDto {
  @IsString()
  @IsNotEmpty()
  bloodBankId: string;

  @IsString()
  @IsNotEmpty()
  bloodBankName: string;

  @IsArray()
  @IsString({ each: true })
  availableUnits: string[];

  @IsNumber()
  @Min(1)
  quantityMl: number;

  @IsString()
  @IsNotEmpty()
  pickupLocation: string;
}

export class CreateSplitOrderDto {
  @IsString()
  @IsNotEmpty()
  parentRequestId: string;

  @IsArray()
  allocationSources: AllocationSourceDto[];
}
