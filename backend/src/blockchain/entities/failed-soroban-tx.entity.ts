import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FailedSorobanTxStatus {
  FAILED = 'FAILED',
  REPLAYED = 'REPLAYED',
}

/**
 * Outbox record for Soroban transactions that exhausted all retry attempts.
 * Persisted so the admin retry endpoint can replay them and the health
 * indicator can report unresolved failures.
 */
@Entity('failed_soroban_txs')
@Index('IDX_FAILED_SOROBAN_STATUS', ['status'])
export class FailedSorobanTxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Bull job ID that permanently failed. */
  @Column({ type: 'varchar', length: 255 })
  jobId: string;

  /** Soroban contract method that was being called. */
  @Column({ type: 'varchar', length: 128 })
  contractMethod: string;

  /** Idempotency key of the original submission. */
  @Column({ type: 'varchar', length: 128 })
  idempotencyKey: string;

  /** Full job payload for replay. */
  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  /** Last error message after all retries. */
  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  /** Number of attempts made before giving up. */
  @Column({ type: 'int', default: 0 })
  attemptsMade: number;

  @Column({
    type: 'varchar',
    length: 32,
    default: FailedSorobanTxStatus.FAILED,
  })
  status: FailedSorobanTxStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
