import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

import { OrganizationReviewEntity } from './organization-review.entity';

@Entity('organization_review_reports')
@Index('UQ_ORG_REVIEW_REPORT_REVIEW_REPORTER', ['reviewId', 'reporterId'], {
  unique: true,
})
export class OrganizationReviewReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'review_id', type: 'uuid' })
  reviewId!: string;

  @Column({ name: 'reporter_id', type: 'uuid' })
  reporterId!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string | null;

  @ManyToOne(() => OrganizationReviewEntity, (review) => review.reports, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'review_id' })
  review!: OrganizationReviewEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id' })
  reporter!: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
