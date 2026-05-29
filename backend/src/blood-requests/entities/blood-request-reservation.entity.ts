import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { BloodRequestEntity } from './blood-request.entity';

export enum ReservationStatus {
  RESERVED = 'RESERVED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  ALLOCATED = 'ALLOCATED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

@Entity('blood_request_reservations')
@Index('idx_reservations_request_item', ['requestId', 'requestItemId'])
@Index('idx_reservations_status', ['status'])
@Index('idx_reservations_expires_at', ['expiresAt'])
export class BloodRequestReservationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId: string;

  @ManyToOne(() => BloodRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'request_id' })
  request: BloodRequestEntity;

  @Column({ name: 'request_item_id', type: 'uuid', nullable: true })
  requestItemId?: string;

  @Column({ name: 'blood_bank_id', type: 'varchar', length: 64 })
  bloodBankId: string;

  @Column({ name: 'blood_unit_id', type: 'varchar', length: 64 })
  bloodUnitId: string;

  @Column({ name: 'quantity_ml', type: 'int' })
  quantityMl: number;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.RESERVED,
  })
  status: ReservationStatus;

  @Column({ name: 'expires_at', type: 'bigint' })
  expiresAt: number;

  @Column({ name: 'released_at', type: 'bigint', nullable: true })
  releasedAt?: number;

  @Column({ name: 'allocated_at', type: 'bigint', nullable: true })
  allocatedAt?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * Check if reservation has expired
   */
  isExpired(currentTimestamp: number): boolean {
    return this.expiresAt < currentTimestamp && this.status !== ReservationStatus.RELEASED;
  }

  /**
   * Mark as allocated
   */
  allocate(timestamp: number): void {
    this.status = ReservationStatus.ALLOCATED;
    this.allocatedAt = timestamp;
  }

  /**
   * Mark as released
   */
  release(timestamp: number): void {
    this.status = ReservationStatus.RELEASED;
    this.releasedAt = timestamp;
  }
}
