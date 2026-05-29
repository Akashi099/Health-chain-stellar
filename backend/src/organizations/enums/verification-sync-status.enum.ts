export enum VerificationSyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  FAILED = 'failed',
  MISMATCH = 'mismatch',
}

export enum VerificationSource {
  BACKEND = 'backend',
  SOROBAN = 'soroban',
}
