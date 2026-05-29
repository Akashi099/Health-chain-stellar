import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum CampaignStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('restocking_campaigns')
export class RestockingCampaignEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blood_type', type: 'varchar' })
  bloodType: string;

  @Column({ name: 'region', type: 'varchar' })
  region: string;

  @Column({ name: 'blood_bank_id', type: 'varchar' })
  bloodBankId: string;

  @Column({ name: 'threshold_units', type: 'int' })
  thresholdUnits: number;

  @Column({ name: 'current_units', type: 'int' })
  currentUnits: number;

  @Column({ name: 'target_units', type: 'int' })
  targetUnits: number;

  @Column({ name: 'audience_size', type: 'int', default: 0 })
  audienceSize: number;

  @Column({ name: 'notifications_sent', type: 'int', default: 0 })
  notificationsSent: number;

  @Column({ name: 'conversions', type: 'int', default: 0 })
  conversions: number;

  @Column({
    type: 'simple-enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
