import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationCategory {
  CRITICAL_SHORTAGE = 'critical_shortage',
  RIDER_ASSIGNMENT = 'rider_assignment',
  DELIVERY_UPDATE = 'delivery_update',
  SETTLEMENT = 'settlement',
  DISPUTE = 'dispute',
  SYSTEM_ALERT = 'system_alert',
  EMERGENCY = 'emergency',
}

export enum EmergencyTier {
  NORMAL = 'normal',
  URGENT = 'urgent',
  CRITICAL = 'critical',
}

@Entity('notification_preferences')
@Index(['userId'])
@Index(['organizationId'])
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'organization_id', nullable: true })
  organizationId: string;

  @Column({
    type: 'enum',
    enum: NotificationCategory,
  })
  category: NotificationCategory;

  @Column('simple-array')
  channels: NotificationChannel[];

  @Column({ name: 'quiet_hours_enabled', default: false })
  quietHoursEnabled: boolean;

  @Column({ name: 'quiet_hours_start', nullable: true })
  quietHoursStart: string; // Format: "HH:MM"

  @Column({ name: 'quiet_hours_end', nullable: true })
  quietHoursEnd: string; // Format: "HH:MM"

  @Column({
    type: 'enum',
    enum: EmergencyTier,
    default: EmergencyTier.NORMAL,
  })
  emergencyBypassTier: EmergencyTier;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
