import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('temperature_samples')
@Index(['deliveryId', 'recordedAt'])
export class TemperatureSampleEntity extends BaseEntity {
  @Column({ name: 'delivery_id' })
  deliveryId: string;

  @Column({ name: 'order_id', nullable: true, type: 'varchar' })
  orderId: string | null;

  @Column({ name: 'temperature_celsius', type: 'float' })
  temperatureCelsius: number;

  @Column({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;

  @Column({ name: 'source', type: 'varchar', default: 'manual' })
  source: string; // 'manual' | 'iot' | 'rider'

  @Column({ name: 'is_excursion', default: false })
  isExcursion: boolean;
}
