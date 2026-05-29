import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

import { BloodRequestEntity } from './blood-request.entity';

export enum FulfillmentLegStatus {
  PENDING = 'PENDING',
  ALLOCATED = 'ALLOCATED',
  RIDER_ASSIGNED = 'RIDER_ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('fulfillment_legs')
@Index('idx_fulfillment_legs_parent_request', ['parentRequestId'])
@Index('idx_fulfillment_legs_status', ['status'])
@Index('idx_fulfillment_legs_blood_bank', ['bloodBankId'])
@Index('idx_fulfillment_legs_rider', ['riderId'])
export class FulfillmentLegEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parent_request_id', type: 'varchar', length: 64 })
  parentRequestId: string;

  @ManyToOne(() => BloodRequestEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_request_id' })
  parentRequest: BloodRequestEntity;

  @Column({ name: 'leg_number', type: 'int' })
  legNumber: number;

  @Column({ name: 'blood_bank_id', type: 'varchar', length: 64 })
  bloodBankId: string;

  @Column({ name: 'blood_bank_name', type: 'varchar', length: 255 })
  bloodBankName: string;

  @Column({ name: 'allocated_units', type: 'simple-array' })
  allocatedUnits: string[];

  @Column({ name: 'quantity_ml', type: 'int' })
  quantityMl: number;

  @Column({ name: 'rider_id', type: 'varchar', length: 64, nullable: true })
  riderId: string | null;

  @Column({ name: 'rider_name', type: 'varchar', length: 255, nullable: true })
  riderName: string | null;

  @Column({
    type: 'varchar',
    length: 24,
    default: FulfillmentLegStatus.PENDING,
  })
  status: FulfillmentLegStatus;

  @Column({ name: 'estimated_delivery_time', type: 'bigint', nullable: true })
  estimatedDeliveryTime: number | null;

  @Column({ name: 'actual_delivery_time', type: 'bigint', nullable: true })
  actualDeliveryTime: number | null;

  @Column({ name: 'pickup_location', type: 'text', nullable: true })
  pickupLocation: string | null;

  @Column({ name: 'delivery_location', type: 'text', nullable: true })
  deliveryLocation: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  isCompleted(): boolean {
    return this.status === FulfillmentLegStatus.DELIVERED;
  }

  isFailed(): boolean {
    return this.status === FulfillmentLegStatus.FAILED;
  }

  isInProgress(): boolean {
    return [
      FulfillmentLegStatus.ALLOCATED,
      FulfillmentLegStatus.RIDER_ASSIGNED,
      FulfillmentLegStatus.IN_TRANSIT,
    ].includes(this.status);
  }

  markAsDelivered(deliveryTime: number): void {
    this.status = FulfillmentLegStatus.DELIVERED;
    this.actualDeliveryTime = deliveryTime;
  }

  markAsFailed(reason: string): void {
    this.status = FulfillmentLegStatus.FAILED;
    this.failureReason = reason;
  }

  assignRider(riderId: string, riderName: string): void {
    this.riderId = riderId;
    this.riderName = riderName;
    this.status = FulfillmentLegStatus.RIDER_ASSIGNED;
  }

  startTransit(): void {
    this.status = FulfillmentLegStatus.IN_TRANSIT;
  }
}
