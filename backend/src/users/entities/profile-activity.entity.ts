import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ProfileActivityType {
  PROFILE_UPDATED = 'profile_updated',
  AVATAR_UPLOADED = 'avatar_uploaded',
  AVATAR_DELETED = 'avatar_deleted',
  PROFILE_VIEWED = 'profile_viewed',
  PASSWORD_CHANGED = 'password_changed',
  EMAIL_CHANGED = 'email_changed',
  PHONE_CHANGED = 'phone_changed',
}

@Entity('profile_activities')
@Index('idx_profile_activities_user_id', ['userId'])
@Index('idx_profile_activities_created_at', ['createdAt'])
export class ProfileActivityEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar' })
  userId: string;

  @Column({
    type: 'enum',
    enum: ProfileActivityType,
  })
  activityType: ProfileActivityType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
