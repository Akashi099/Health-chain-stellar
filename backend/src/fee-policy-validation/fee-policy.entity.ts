import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FeePolicyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
}

export enum FeeRecipientType {
  PROVIDER = 'provider',
  INSURER = 'insurer',
  PATIENT = 'patient',
}

/**
 * Stores a named fee configuration for a HealthChain payment corridor.
 * All percentage-based fees are stored in basis points (100 bp = 1 %).
 * All flat/amount fees are stored in stroops.
 */
@Entity('fee_policies')
@Index(['name', 'recipientType'], { unique: true })
export class FeePolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable policy label, e.g. "Standard Provider Payout" */
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({
    type: 'enum',
    enum: FeeRecipientType,
    default: FeeRecipientType.PROVIDER,
  })
  recipientType: FeeRecipientType;

  /** Platform fee in basis points (0–500) */
  @Column({ type: 'int', default: 0, name: 'platform_fee_bp' })
  platformFeeBp: number;

  /** Insurance processing fee in basis points (0–300) */
  @Column({ type: 'int', default: 0, name: 'insurance_fee_bp' })
  insuranceFeeBp: number;

  /** Optional fixed fee in stroops applied before percentage fees */
  @Column({
    type: 'bigint',
    default: 0,
    name: 'flat_fee_stroops',
    transformer: {
      to: (v: number) => v,
      from: (v: string) => parseInt(v, 10),
    },
  })
  flatFeeStroops: number;

  /**
   * Stellar network fee override in stroops.
   * Must be >= STELLAR_BASE_FEE_STROOPS (100).
   */
  @Column({
    type: 'int',
    default: 100,
    name: 'stellar_network_fee_stroops',
  })
  stellarNetworkFeeStroops: number;

  @Column({
    type: 'enum',
    enum: FeePolicyStatus,
    default: FeePolicyStatus.DRAFT,
  })
  status: FeePolicyStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
