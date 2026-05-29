import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { BloodUnit } from './blood-unit.entity';
import { UnitDisposition, DispositionReason } from '../enums/unit-disposition.enum';

@Entity('unit_dispositions')
export class UnitDispositionRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'blood_unit_id' })
  bloodUnitId: string;

  @ManyToOne(() => BloodUnit)
  @JoinColumn({ name: 'blood_unit_id' })
  bloodUnit: BloodUnit;

  @Column({
    type: 'enum',
    enum: UnitDisposition,
  })
  disposition: UnitDisposition;

  @Column({
    type: 'enum',
    enum: DispositionReason,
  })
  reason: DispositionReason;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'decided_by', nullable: true })
  decidedBy: string;

  @Column({ name: 'elapsed_time_minutes', type: 'int', nullable: true })
  elapsedTimeMinutes: number;

  @Column({ name: 'temperature_breach', type: 'boolean', default: false })
  temperatureBreach: boolean;

  @Column({ name: 'cold_chain_verified', type: 'boolean', default: false })
  coldChainVerified: boolean;

  @CreateDateColumn({ name: 'decided_at' })
  decidedAt: Date;
}
