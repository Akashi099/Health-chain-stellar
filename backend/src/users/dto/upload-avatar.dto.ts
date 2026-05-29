import { IsString, IsOptional, IsNumber } from 'class-validator';

export class UploadAvatarDto {
  @IsString()
  originalName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  size: number;

  @IsString()
  @IsOptional()
  buffer?: string; // Base64 encoded buffer
}
