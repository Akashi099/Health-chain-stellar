import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('dispute_notes')
@Index(['disputeId'])
export class DisputeNoteEntity extends BaseEntity {
  @Column({ name: 'dispute_id' })
  disputeId: string;

  @Column({ name: 'author_id' })
  authorId: string;

  @Column({ type: 'text' })
  content: string;
}
