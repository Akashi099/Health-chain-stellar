import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('assignment_weights')
export class AssignmentWeightsEntity extends BaseEntity {
  @Column({ name: 'name', unique: true })
  name: string; // e.g. 'default'

  @Column({ name: 'distance_weight', type: 'float', default: 0.3 })
  distanceWeight: number;

  @Column({ name: 'reputation_weight', type: 'float', default: 0.25 })
  reputationWeight: number;

  @Column({ name: 'rejection_rate_weight', type: 'float', default: 0.2 })
  rejectionRateWeight: number;

  @Column({ name: 'completion_rate_weight', type: 'float', default: 0.15 })
  completionRateWeight: number;

  @Column({ name: 'cold_chain_weight', type: 'float', default: 0.1 })
  coldChainWeight: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
