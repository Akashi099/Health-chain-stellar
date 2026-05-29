import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  BaseEntity,
} from 'typeorm';

import { BloodUnit } from './blood-unit.entity';

export enum TransferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('blood_unit_transfers')
export class TransferRecord extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blood_unit_id', type: 'uuid' })
  bloodUnitId: string;

  @Column({ name: 'source_org_id', type: 'uuid' })
  sourceOrgId: string;

  @Column({ name: 'destination_org_id', type: 'uuid' })
  destinationOrgId: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.PENDING,
  })
  status: TransferStatus;

  @Column({ name: 'initiated_by_user_id', type: 'uuid' })
  initiatedByUserId: string;

  @Column({ name: 'accepted_by_user_id', type: 'uuid', nullable: true })
  acceptedByUserId: string | null;

  @Column({ name: 'accepted_at', type: 'timestamp', nullable: true })
  acceptedAt: Date | null;

  @ManyToOne(() => BloodUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blood_unit_id' })
  bloodUnit: BloodUnit;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
