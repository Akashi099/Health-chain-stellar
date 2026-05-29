import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

import { OrganizationReviewEntity } from './organization-review.entity';

@Entity('organization_review_moderation_logs')
export class OrganizationReviewModerationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId!: string;

  @Column({ name: 'admin_user_id', type: 'uuid', nullable: true })
  adminUserId?: string | null;

  @Column({ type: 'varchar', length: 50 })
  action!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @ManyToOne(
    () => OrganizationReviewEntity,
    (review) => review.moderationLogs,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({ name: 'review_id' })
  review!: OrganizationReviewEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'admin_user_id' })
  adminUser?: UserEntity | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
