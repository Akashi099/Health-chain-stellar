import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class VerifyQrDto {
  /** The raw QR payload scanned at bedside */
  @IsString()
  @IsNotEmpty()
  qrPayload: string;

  /** The order/request this unit is being delivered against */
  @IsUUID()
  orderId: string;

  /** Hospital staff member performing the scan */
  @IsUUID()
  scannedBy: string;
}
