import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AlertType {
  LOW_STOCK = 'low_stock',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
  OUT_OF_STOCK = 'out_of_stock',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  DISMISSED = 'dismissed',
  RESOLVED = 'resolved',
}

@Entity('inventory_alerts')
@Index('idx_inventory_alerts_type', ['alertType'])
@Index('idx_inventory_alerts_status', ['status'])
@Index('idx_inventory_alerts_blood_bank', ['bloodBankId'])
@Index('idx_inventory_alerts_created_at', ['createdAt'])
export class InventoryAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blood_bank_id', type: 'varchar' })
  bloodBankId: string;

  @Column({ name: 'blood_type', type: 'varchar', nullable: true })
  bloodType: string | null;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  alertType: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
  })
  severity: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'threshold_value', type: 'int', nullable: true })
  thresholdValue: number | null;

  @Column({ name: 'current_value', type: 'int', nullable: true })
  currentValue: number | null;

  @Column({ name: 'dismissed_at', type: 'timestamp', nullable: true })
  dismissedAt: Date | null;

  @Column({ name: 'dismissed_by', type: 'varchar', nullable: true })
  dismissedBy: string | null;

  @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', type: 'varchar', nullable: true })
  resolvedBy: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
