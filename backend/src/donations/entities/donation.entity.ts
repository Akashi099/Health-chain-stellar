import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';
import { UserEntity } from '../../users/entities/user.entity';
import { DonationStatus, DonationAsset } from '../enums/donation.enum';

@Entity('donations')
@Index('IDX_DONATION_MEMO', ['memo'])
@Index('IDX_DONATION_PAYER', ['payerAddress'])
export class DonationEntity {
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
  recipientId: string; // The specific healthcare project or hospital ID

  @Column({
    type: 'enum',
    enum: DonationStatus,
    default: DonationStatus.PENDING,
  })
  status: DonationStatus;

  @Column({ type: 'varchar', length: 64, unique: true })
  memo: string; // The unique Stellar memo for tracking

  @Column({ type: 'varchar', length: 64, nullable: true })
  transactionHash: string;

  @ManyToOne(() => UserEntity, { nullable: true })
  donorUser: UserEntity;

  @Column({ nullable: true })
  donorUserId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
}
