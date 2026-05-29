import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { DonationAsset } from '../enums/donation.enum';
import { PledgeFrequency, PledgeStatus } from '../enums/pledge.enum';

@Entity('pledges')
@Index('IDX_PLEDGE_PAYER', ['payerAddress'])
@Index('IDX_PLEDGE_MEMO', ['memo'])
export class PledgeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 20, scale: 7 })
  amount: number;

  @Column({
    type: 'enum',
    enum: DonationAsset,
    default: DonationAsset.XLM,
  })
  asset: DonationAsset;

  @Column({ type: 'varchar', length: 56 })
  payerAddress: string;

  @Column({ type: 'varchar', length: 120 })
  recipientId: string;

  @Column({
    type: 'enum',
    enum: PledgeFrequency,
    default: PledgeFrequency.MONTHLY,
  })
  frequency: PledgeFrequency;

  @Column({ type: 'varchar', length: 200, default: '' })
  causeTag: string;

  @Column({ type: 'varchar', length: 200, default: '' })
  regionTag: string;

  @Column({ default: false })
  emergencyPool: boolean;

  @Column({
    type: 'enum',
    enum: PledgeStatus,
    default: PledgeStatus.ACTIVE,
  })
  status: PledgeStatus;

  @Column({ type: 'varchar', length: 64, unique: true })
  memo: string;

  /** On-chain pledge id from Soroban `PaymentContract::create_pledge`, when recorded */
  @Column({ type: 'varchar', length: 32, nullable: true })
  sorobanPledgeId: string | null;

  @Column({ nullable: true })
  donorUserId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  nextExecutionAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
