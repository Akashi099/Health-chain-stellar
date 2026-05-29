import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('location_history')
@Index('idx_location_history_rider_time', ['riderId', 'recordedAt'])
@Index('idx_location_history_order_id', ['orderId'])
@Index('idx_location_history_recorded_at', ['recordedAt'])
export class LocationHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'rider_id', type: 'varchar' })
  riderId: string;

  @Column({ name: 'order_id', type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ name: 'longitude', type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  /** GPS accuracy radius in metres (optional, device-provided). */
  @Column({ type: 'float', nullable: true })
  accuracy: number | null;

  /** Speed in m/s (optional, device-provided). */
  @Column({ type: 'float', nullable: true })
  speed: number | null;

  /** Compass heading in degrees 0–360 (optional, device-provided). */
  @Column({ type: 'float', nullable: true })
  heading: number | null;

  /** Altitude in metres above sea level (optional, device-provided). */
  @Column({ type: 'float', nullable: true })
  altitude: number | null;

  /** Client-side timestamp of the fix; defaults to server receive time if omitted. */
  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'NOW()' })
  recordedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
