import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';
import { ReviewModerationStatus } from '../enums/review-moderation-status.enum';

import { OrganizationReviewModerationLogEntity } from './organization-review-moderation-log.entity';
import { OrganizationReviewReportEntity } from './organization-review-report.entity';
import { OrganizationEntity } from './organization.entity';

@Entity('organization_reviews')
@Index('IDX_ORG_REVIEWS_ORG_ID', ['organizationId'])
@Index('IDX_ORG_REVIEWS_REVIEWER_ID', ['reviewerId'])
@Index('UQ_ORG_REVIEW_ORG_REVIEWER', ['organizationId', 'reviewerId'], {
  unique: true,
})
export class OrganizationReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'reviewer_id', type: 'uuid' })
  reviewerId!: string;

  @Column({ type: 'int' })
  rating!: number;

  @Column({ name: 'review_text', type: 'text', nullable: true })
  reviewText?: string | null;

  @Column({ name: 'is_flagged', type: 'boolean', default: false })
  isFlagged!: boolean;

  @Column({ name: 'is_hidden', type: 'boolean', default: false })
  isHidden!: boolean;

  @Column({ name: 'report_count', type: 'int', default: 0 })
  reportCount!: number;

  @Column({
    name: 'moderation_status',
    type: 'enum',
    enum: ReviewModerationStatus,
    default: ReviewModerationStatus.VISIBLE,
  })
  moderationStatus!: ReviewModerationStatus;

  @ManyToOne(() => OrganizationEntity, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization!: OrganizationEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reviewer_id' })
  reviewer!: UserEntity;

  @OneToMany(() => OrganizationReviewReportEntity, (report) => report.review)
  reports!: OrganizationReviewReportEntity[];

  @OneToMany(() => OrganizationReviewModerationLogEntity, (log) => log.review)
  moderationLogs!: OrganizationReviewModerationLogEntity[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
