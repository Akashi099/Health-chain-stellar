import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  bloodType: string;

  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  bloodBankId: string;

  @IsInt()
  @Min(1)
  thresholdUnits: number;

  @IsInt()
  @Min(1)
  targetUnits: number;
}
