import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationChannel, NotificationCategory } from './notification-preference.entity';

export enum DeliveryStatus {
  SENT = 'sent',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

@Entity('notification_delivery_logs')
@Index(['userId'])
@Index(['createdAt'])
export class NotificationDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
  })
  category: NotificationCategory;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
  })
  channel: NotificationChannel;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
  })
  status: DeliveryStatus;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @Column({ name: 'emergency_bypass', default: false })
  emergencyBypass: boolean;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'policy_version_ref', nullable: true })
  policyVersionRef: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
