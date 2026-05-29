import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('assignment_decisions')
@Index(['orderId'])
export class AssignmentDecisionEntity extends BaseEntity {
  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'selected_rider_id' })
  selectedRiderId: string;

  @Column({ name: 'weights_snapshot', type: 'jsonb' })
  weightsSnapshot: Record<string, number>;

  @Column({ name: 'candidates', type: 'jsonb' })
  candidates: Array<{ riderId: string; totalScore: number; breakdown: Record<string, number> }>;

  @Column({ name: 'policy_version_ref', nullable: true })
  policyVersionRef: string | null;
}
