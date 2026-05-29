export class VerificationSyncStatusDto {
  id!: string;
  name!: string;
  status!: string;
  syncStatus!: string;
  verificationSource!: string;
  verifiedAt?: Date | null;
  syncedAt?: Date | null;
  verificationTxHash?: string | null;
  sorobanVerifiedAt?: Date | null;
  syncErrorMessage?: string | null;
  syncRetryCount!: number;
}
