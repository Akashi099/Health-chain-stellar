import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum QrVerificationResult {
  MATCH = 'MATCH',
  MISMATCH = 'MISMATCH',
}

@Entity('qr_verification_logs')
export class QrVerificationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'unit_number', type: 'varchar' })
  unitNumber: string;

  @Column({ name: 'order_id', type: 'varchar' })
  orderId: string;

  @Column({ name: 'scanned_by', type: 'varchar' })
  scannedBy: string;

  @Column({
    type: 'simple-enum',
    enum: QrVerificationResult,
  })
  result: QrVerificationResult;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @CreateDateColumn({ name: 'scanned_at' })
  scannedAt: Date;
}
