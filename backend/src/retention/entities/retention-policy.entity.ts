import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DataCategory {
  DONOR_DATA = 'donor_data',
  RIDER_DATA = 'rider_data',
  ORGANIZATION_DATA = 'organization_data',
  DELIVERY_EVIDENCE = 'delivery_evidence',
  LOCATION_HISTORY = 'location_history',
  MEDICAL_RECORDS = 'medical_records',
}

export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_INTEREST = 'public_interest',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
}

export enum RetentionAction {
  DELETE = 'delete',
  ANONYMIZE = 'anonymize',
  ARCHIVE = 'archive',
}

@Entity('retention_policies')
@Index('idx_retention_policies_category', ['dataCategory'])
@Index('idx_retention_policies_active', ['isActive'])
export class RetentionPolicyEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'data_category',
    type: 'enum',
    enum: DataCategory,
  })
  dataCategory: DataCategory;

  @Column({
    name: 'legal_basis',
    type: 'enum',
    enum: LegalBasis,
  })
  legalBasis: LegalBasis;

  @Column({ name: 'retention_period_days', type: 'int' })
  retentionPeriodDays: number;

  @Column({
    name: 'retention_action',
    type: 'enum',
    enum: RetentionAction,
    default: RetentionAction.ANONYMIZE,
  })
  retentionAction: RetentionAction;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by_user_id', type: 'uuid', nullable: true })
  createdByUserId?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}