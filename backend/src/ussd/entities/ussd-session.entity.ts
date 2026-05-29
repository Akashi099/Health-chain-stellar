import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UssdSessionState {
  STARTED = 'started',
  HOSPITAL_IDENTITY = 'hospital_identity',
  BLOOD_TYPE = 'blood_type',
  QUANTITY = 'quantity',
  URGENCY = 'urgency',
  LOCATION = 'location',
  CONFIRMATION = 'confirmation',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('ussd_sessions')
export class UssdSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id', unique: true })
  sessionId: string;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column({
    type: 'enum',
    enum: UssdSessionState,
    default: UssdSessionState.STARTED,
  })
  state: UssdSessionState;

  @Column({ name: 'hospital_id', nullable: true })
  hospitalId: string;

  @Column({ name: 'blood_type', nullable: true })
  bloodType: string;

  @Column({ type: 'int', nullable: true })
  quantity: number;

  @Column({ nullable: true })
  urgency: string;

  @Column({ type: 'text', nullable: true })
  location: string;

  @Column({ name: 'request_id', nullable: true })
  requestId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'expires_at' })
  expiresAt: Date;
}
